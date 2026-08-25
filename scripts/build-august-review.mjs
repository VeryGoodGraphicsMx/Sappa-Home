import { readFile, writeFile } from 'node:fs/promises';

const sourceFiles = {
  es: new URL('../data/inventory-preview-originals.json', import.meta.url),
  en: new URL('../data/inventory-preview-originals-en.json', import.meta.url)
};

const outputFiles = {
  es: new URL('../data/inventory-review-august.json', import.meta.url),
  en: new URL('../data/inventory-review-august-en.json', import.meta.url)
};

const asset = name => `/assets/review-august/${name}`;

function setImages(product, images) {
  product.images = [...images];
  product.imageUrls = [...images];
}

function appendImages(product, images) {
  setImages(product, [...new Set([...product.images, ...images])]);
}

function updateProduct(products, sku, update) {
  const product = products.find(item => item.sku === sku);
  if (!product) throw new Error(`No se encontro ${sku}.`);
  update(product);
}

function buildReviewInventory(products, language) {
  const review = structuredClone(products).filter(product => product.sku !== 'LC-7');

  // Correcciones estructurales confirmadas por el cliente.
  ['LMI-1', 'LMI-2'].forEach(sku => updateProduct(review, sku, product => {
    product.category = language === 'en' ? 'MIXED LINEN INDIANA' : 'LINO MIXTO INDIANA';
  }));
  review.filter(product => product.sku.startsWith('VVC-')).forEach(product => {
    product.category = language === 'en' ? 'BRAIDED SHORT BRIM FEDORA HAT' : 'VUELTA Y VUELTA CATRIN';
  });
  review.filter(product => product.sku.startsWith('VVP-')).forEach(product => {
    product.category = language === 'en' ? 'BRAIDED LONG BRIM FEDORA HAT' : 'VUELTA Y VUELTA PLANO';
  });

  updateProduct(review, 'VB-1', product => {
    product.material = language === 'en' ? 'Fine woven cellulose.' : 'Celulosa, tejido fino.';
  });

  // LI-1: las fotos 1, 2 y 3 no corresponden al modelo Lino Indiana.
  // Se conservan solamente las vistas 4, 5 y 6 dentro de la propuesta nueva.
  updateProduct(review, 'LI-1', product => {
    setImages(product, [4, 5, 6].map(index => `/assets/preview-originals/li-1-0${index}.jpg`));
  });

  // LAC-1 continua pendiente. La comparativa confirmada corresponde a
  // LAI-1 (izquierda) y LAC-2 (derecha), y aparece al final de ambos modelos.
  const lacComparisonImage = '/assets/preview-originals/lac-2-lai-1-comparativa.jpg';
  updateProduct(review, 'LAC-1', product => {
    product.status = 'pending-photo';
    setImages(product, []);
    delete product.comparisonLabels;
  });
  ['LAC-2', 'LAI-1'].forEach(sku => {
    updateProduct(review, sku, product => {
      product.comparisonLabels = {
        image: lacComparisonImage,
        left: 'LAI-1',
        right: 'LAC-2'
      };
    });
  });

  // MMI-3 usa copias grises editadas; los originales permanecen intactos.
  updateProduct(review, 'MMI-3', product => {
    setImages(product, [1, 2, 4].map(index => asset(`mmi-3-gray-0${index}.jpg`)));
  });

  // MMI-2: se retira la tercera fotografia de la galeria.
  updateProduct(review, 'MMI-2', product => {
    setImages(product, product.images.filter((image, index) => index !== 2));
  });

  // Fotografias nuevas identificadas por SKU en el chat del cliente.
  const appendBySku = {
    'LCZ-1': ['lcz-1-update-01.jpg', 'lcz-1-update-02.jpg', 'lcz-1-update-03.jpg'],
    'H-2': ['h-2-update-01.jpg'],
    'LCZ-2': ['lcz-2-update-01.jpg', 'lcz-2-interior.jpg'],
    'MMI-1': ['mmi-1-interior.jpg'],
    'TCI-1': ['tci-1-update-01.jpg'],
    'VE-4': ['ve-4-interior.jpg'],
    'CPF-1': ['cpf-1-interior.jpg']
  };
  Object.entries(appendBySku).forEach(([sku, names]) => {
    updateProduct(review, sku, product => appendImages(product, names.map(asset)));
  });

  // H-2: la segunda vista pasa a portada y se excluye la playera amarilla.
  updateProduct(review, 'H-2', product => {
    setImages(product, [
      '/assets/preview-originals/h-2-02.jpg',
      '/assets/preview-originals/h-2-01.jpg',
      asset('h-2-update-01.jpg')
    ]);
  });

  // MMC-1 y MMC-2 conservan solamente sus tres vistas individuales.
  // La cuarta fotografia compartida se muestra como una tarjeta comparativa independiente.
  const mmcComparisonImage = '/assets/preview-originals/mmc-1-mmc-2-comparativa.jpg';
  ['MMC-1', 'MMC-2'].forEach(sku => {
    updateProduct(review, sku, product => {
      setImages(product, product.images.filter(image => image !== mmcComparisonImage));
    });
  });
  const mmc2Index = review.findIndex(product => product.sku === 'MMC-2');
  if (mmc2Index < 0) throw new Error('No se encontro MMC-2 para insertar la imagen comparativa.');
  review.splice(mmc2Index + 1, 0, {
    id: 'MMC-COMPARATIVA',
    sku: language === 'en' ? 'COMPARISON IMAGE' : 'IMAGEN COMPARATIVA',
    handle: 'mmc-1-mmc-2-comparativa',
    name: language === 'en' ? 'Comparison image' : 'Imagen comparativa',
    category: review[mmc2Index].category,
    material: '',
    active: true,
    status: 'comparison',
    images: [mmcComparisonImage],
    imageUrls: [mmcComparisonImage]
  });

  // La vista trasera compartida fue confirmada para estas claves TPC.
  ['TPC-1', 'TPC-2', 'TPC-3', 'TPC-4', 'TPC-7', 'TPC-8', 'TPC-9', 'TPC-11', 'TPC-12', 'TPC-13', 'TPC-14', 'TPC-15']
    .forEach(sku => {
      updateProduct(review, sku, product => appendImages(product, [asset('tpc-shared-rear.png')]));
    });
  updateProduct(review, 'TPC-3', product => {
    setImages(product, [asset('tpc-3-01.jpg'), asset('tpc-3-02.jpg'), asset('tpc-shared-rear.png')]);
  });

  // Lino Cazuelita: la primera fotografia pasa al final de cada galeria.
  review.filter(product => product.sku.startsWith('LCZ-') && product.images.length > 1)
    .forEach(product => setImages(product, [...product.images.slice(1), product.images[0]]));

  // LCZ-1: sobre el orden visible anterior, la foto 3 pasa a 1,
  // la foto 1 pasa a 2 y la foto 2 se retira.
  updateProduct(review, 'LCZ-1', product => {
    const [photo1, , photo3, ...remainingPhotos] = product.images;
    setImages(product, [photo3, photo1, ...remainingPhotos]);
  });

  // LCZ-2: sobre el orden visible anterior, la foto 3 pasa a 1,
  // la foto 1 pasa a 2 y la foto 2 pasa a 3.
  updateProduct(review, 'LCZ-2', product => {
    const [photo1, photo2, photo3] = product.images;
    setImages(product, [photo3, photo1, photo2]);
  });

  // LCZ-3 y LCZ-4: la cuarta foto visible pasa a la segunda posicion.
  ['LCZ-3', 'LCZ-4'].forEach(sku => {
    updateProduct(review, sku, product => {
      const [photo1, photo2, photo3, photo4, ...remainingPhotos] = product.images;
      setImages(product, [photo1, photo4, photo2, photo3, ...remainingPhotos]);
    });
  });

  ['VVC-1', 'VVC-2', 'VVC-6'].forEach(sku => {
    updateProduct(review, sku, product => appendImages(product, [asset('vvc-shared-interior.jpg')]));
  });
  updateProduct(review, 'VVC-2', product => appendImages(product, [asset('vvc-2-interior.jpg')]));

  // Se retira la tercera vista de VVC-1 y la cuarta de VVC-2.
  updateProduct(review, 'VVC-1', product => {
    setImages(product, product.images.filter((image, index) => index !== 2));
  });
  updateProduct(review, 'VVC-2', product => {
    setImages(product, product.images.filter((image, index) => index !== 3));
  });

  // La cuarta foto de VVP-1 corresponde a VVP-2 y pasa a ser su portada.
  const vvp2Front = '/assets/preview-originals/vvp-1-04.jpg';
  updateProduct(review, 'VVP-1', product => {
    setImages(product, product.images.filter(image => image !== vvp2Front));
  });
  updateProduct(review, 'VVP-2', product => {
    setImages(product, [vvp2Front, asset('vvp-2-confirmed.jpg')]);
  });

  // VM-2 foto 4 se retira; la foto 5 compara VM-1 (izquierda) y VM-2
  // (derecha), por lo que tambien se agrega al final de VM-1.
  const vmComparisonImage = '/assets/preview-originals/vm-2-05.jpg';
  updateProduct(review, 'VM-2', product => {
    setImages(product, product.images.filter((image, index) => index !== 3));
    product.comparisonLabels = {
      image: vmComparisonImage,
      left: 'VM-1',
      right: 'VM-2'
    };
  });
  updateProduct(review, 'VM-1', product => {
    appendImages(product, [vmComparisonImage]);
    product.comparisonLabels = {
      image: vmComparisonImage,
      left: 'VM-1',
      right: 'VM-2'
    };
  });

  // VVC-5 se conserva como ficha pendiente, tal como solicito el cliente.
  const vvc4Index = review.findIndex(product => product.sku === 'VVC-4');
  if (vvc4Index < 0) throw new Error('No se encontro VVC-4 para insertar VVC-5.');
  review.splice(vvc4Index + 1, 0, {
    id: 'VVC-5',
    sku: 'VVC-5',
    handle: 'vvc-5-pendiente',
    name: 'VVC-5',
    category: language === 'en' ? 'BRAIDED SHORT BRIM FEDORA HAT' : 'VUELTA Y VUELTA CATRIN',
    material: language === 'en' ? 'Cotton crown and brim, polyester hatband.' : 'Cinta de celulosa y toquilla poliester',
    active: true,
    status: 'pending-photo',
    images: [],
    imageUrls: []
  });

  return review;
}

for (const language of Object.keys(sourceFiles)) {
  const source = JSON.parse(await readFile(sourceFiles[language], 'utf8'));
  const review = buildReviewInventory(source, language);
  await writeFile(outputFiles[language], `${JSON.stringify(review, null, 2)}\n`, 'utf8');
}
