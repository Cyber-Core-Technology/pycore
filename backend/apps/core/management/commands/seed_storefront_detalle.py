"""
python manage.py seed_storefront_detalle

Enriquece los 30 productos del demo de Abarrotes La Estrella con:
  - descripcion_larga  → texto detallado para la página de detalle
  - ficha_tecnica      → lista de pares {clave, valor} con especificaciones
  - galeria_imagenes   → vacío por defecto (las imágenes se asignan desde el panel)
  - visibilidad_publica → publico_con_stock (para que aparezcan en la tienda)
  - slug               → generado automáticamente si no existe

También activa pagina_detalle_activa en el ConfiguracionStorefront de la empresa demo.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


# ── Datos de enriquecimiento por código de producto ───────────────────────────
# Cada entrada: codigo -> (descripcion_larga, ficha_tecnica)

DETALLE_PRODUCTOS = {
    "P001": (
        "El Arroz Extra 1kg es un arroz de grano largo, seleccionado y blanqueado para "
        "garantizar una cocción perfecta y esponjosa. Ideal para acompañar cualquier platillo "
        "mexicano: arroz rojo, arroz blanco, arroz a la mexicana o guarnición. Su bajo contenido "
        "de humedad permite un almacenamiento prolongado sin perder calidad. Producto nacional, "
        "libre de colorantes y conservadores artificiales.",
        [
            {"clave": "Contenido neto", "valor": "1 kg"},
            {"clave": "Tipo de grano",  "valor": "Grano largo"},
            {"clave": "Proceso",        "valor": "Blanqueado y pulido"},
            {"clave": "Tiempo de cocción", "valor": "18-20 minutos"},
            {"clave": "Rendimiento aprox.", "valor": "3 tazas cocidas por taza cruda"},
            {"clave": "Calorías",       "valor": "360 kcal / 100 g"},
            {"clave": "Gluten",         "valor": "Sin gluten"},
            {"clave": "Origen",         "valor": "México"},
        ],
    ),
    "P002": (
        "El Frijol Negro 1kg es cosechado en las regiones tropicales de Veracruz y Tabasco, "
        "reconocidas por producir el frijol negro más cremoso y de piel más suave de México. "
        "Perfecto para caldos, frijoles de olla, refritos y tamales. Rico en proteínas vegetales, "
        "fibra dietética y hierro. Sin aditivos ni conservadores. Recomendamos remojar 8 horas "
        "antes de cocinar para reducir el tiempo de cocción y mejorar la digestibilidad.",
        [
            {"clave": "Contenido neto",   "valor": "1 kg"},
            {"clave": "Variedad",         "valor": "Frijol negro (Phaseolus vulgaris)"},
            {"clave": "Región de origen", "valor": "Veracruz / Tabasco, México"},
            {"clave": "Proteínas",        "valor": "22 g / 100 g (crudo)"},
            {"clave": "Fibra dietética",  "valor": "16 g / 100 g"},
            {"clave": "Tiempo de cocción","valor": "60-90 min (previo remojo 8 h)"},
            {"clave": "Conservación",     "valor": "Lugar fresco y seco, hasta 12 meses"},
            {"clave": "Alérgenos",        "valor": "Libre de gluten, sin soya"},
        ],
    ),
    "P003": (
        "El Aceite Vegetal 1lt es una mezcla refinada de aceites de maíz y canola, con alto "
        "punto de humeo que lo hace ideal para freír, saltear y hornear. Su proceso de refinado "
        "elimina impurezas y olores, garantizando un sabor neutro que realza los ingredientes "
        "sin enmascarar aromas. Bajo en grasas saturadas y libre de colesterol. Excelente para "
        "aderezos fríos, mayonesas caseras y marinas.",
        [
            {"clave": "Contenido neto",    "valor": "1 litro"},
            {"clave": "Tipo de aceite",    "valor": "Mezcla maíz y canola refinados"},
            {"clave": "Punto de humeo",    "valor": "230 °C"},
            {"clave": "Grasas saturadas",  "valor": "7 g / 100 ml"},
            {"clave": "Grasas trans",      "valor": "0 g"},
            {"clave": "Colesterol",        "valor": "0 mg"},
            {"clave": "Calorías",          "valor": "884 kcal / 100 ml"},
            {"clave": "Envase",            "valor": "Botella PET reciclable"},
        ],
    ),
    "P004": (
        "La Harina de Maíz Nixtamalizada 1kg es el ingrediente base para preparar tortillas, "
        "tamales, gorditas, tlayudas y sopes auténticos en casa. Elaborada mediante el proceso "
        "tradicional de nixtamalización con cal, que incrementa la biodisponibilidad de niacina "
        "y aminoácidos esenciales. Textura fina y uniforme para una masa perfecta. Solo mezcla "
        "con agua tibia y sal, amasa y cocina en comal caliente.",
        [
            {"clave": "Contenido neto",    "valor": "1 kg"},
            {"clave": "Proceso",           "valor": "Nixtamalización con cal"},
            {"clave": "Granulometría",     "valor": "Fina (< 0.3 mm)"},
            {"clave": "Humedad",           "valor": "Máx. 12%"},
            {"clave": "Proteínas",         "valor": "8 g / 100 g"},
            {"clave": "Carbohidratos",     "valor": "73 g / 100 g"},
            {"clave": "Rendimiento",       "valor": "~20 tortillas de 15 cm por kilo"},
            {"clave": "Conservación",      "valor": "Lugar fresco y seco, cerrado"},
        ],
    ),
    "P005": (
        "El Azúcar Estándar 1kg es azúcar blanca refinada de caña de azúcar, procesada en "
        "ingenios mexicanos bajo estrictos estándares de higiene. Cristal fino y uniforme, "
        "alta pureza (99.7% sacarosa), ideal para endulzar bebidas, hornear panes, pasteles, "
        "conservas y mermeladas. Producto básico de despensa con larga vida de anaquel cuando "
        "se almacena en recipiente hermético alejado de la humedad.",
        [
            {"clave": "Contenido neto", "valor": "1 kg"},
            {"clave": "Tipo",           "valor": "Azúcar blanca refinada de caña"},
            {"clave": "Pureza",         "valor": "Mín. 99.7% sacarosa"},
            {"clave": "Humedad",        "valor": "Máx. 0.06%"},
            {"clave": "Calorías",       "valor": "387 kcal / 100 g"},
            {"clave": "Carbohidratos",  "valor": "100 g / 100 g"},
            {"clave": "Origen",         "valor": "Caña de azúcar mexicana"},
            {"clave": "Conservación",   "valor": "Recipiente hermético, lugar seco"},
        ],
    ),
    "P006": (
        "La Sal de Mesa 1kg es sal refinada con yodo y fluoruro agregados, cumpliendo la "
        "norma oficial mexicana NOM-040-SSA1 para sal yodatada y fluorurada. Grano fino y "
        "uniforme para disolución rápida. Indispensable en la cocina para sazonar, conservar "
        "alimentos y elaborar encurtidos. El yodo es esencial para la función tiroidea y el "
        "fluoruro contribuye a la salud dental.",
        [
            {"clave": "Contenido neto",    "valor": "1 kg"},
            {"clave": "Tipo",              "valor": "Sal refinada yodatada y fluorurada"},
            {"clave": "Granulometría",     "valor": "Fina"},
            {"clave": "Yodo",              "valor": "20-40 mg / kg (NOM-040-SSA1)"},
            {"clave": "Fluoruro",          "valor": "100-200 mg / kg"},
            {"clave": "Sodio",             "valor": "393 mg / g de sal"},
            {"clave": "Aditivos",          "valor": "Antiaglomerante (máx. 0.5%)"},
            {"clave": "Norma",             "valor": "NOM-040-SSA1-1993"},
        ],
    ),
    "P007": (
        "El Atún en Agua 140g es atún aleta amarilla (Thunnus albacares) capturado en el "
        "Océano Pacífico, procesado y envasado en agua con sal para preservar su sabor natural "
        "y proteínas de alto valor biológico. Sin conservadores artificiales ni glutamato "
        "monosódico. Excelente para ensaladas, sándwiches, tacos, tostadas y pastas. "
        "Certificado sin mercurio excesivo, apto para consumo frecuente.",
        [
            {"clave": "Contenido neto",   "valor": "140 g (escurrido: 100 g)"},
            {"clave": "Especie",          "valor": "Atún aleta amarilla (Thunnus albacares)"},
            {"clave": "Medio de conserva","valor": "Agua con sal"},
            {"clave": "Proteínas",        "valor": "26 g / 100 g escurrido"},
            {"clave": "Grasas totales",   "valor": "1 g / 100 g"},
            {"clave": "Sodio",            "valor": "300 mg / 100 g"},
            {"clave": "Envase",           "valor": "Lata de hojalata fácil apertura"},
            {"clave": "Alérgenos",        "valor": "Pescado. Sin gluten."},
        ],
    ),
    "P008": (
        "Las Sardinas en Tomate 425g son sardinas del Pacífico (Sardinops sagax) cocidas y "
        "envasadas en salsa de tomate natural condimentada con especias. Fuente excepcional de "
        "Omega-3, calcio (por las espinas comestibles ablandadas) y vitamina D. Ideales para "
        "servir sobre tostadas, en tacos o como guisado rápido con frijoles. Lata de gran "
        "formato, perfecta para familia.",
        [
            {"clave": "Contenido neto",   "valor": "425 g (escurrido: 300 g)"},
            {"clave": "Especie",          "valor": "Sardina del Pacífico (Sardinops sagax)"},
            {"clave": "Salsa",            "valor": "Tomate natural con especias"},
            {"clave": "Omega-3",          "valor": "1.8 g / 100 g"},
            {"clave": "Calcio",           "valor": "380 mg / 100 g"},
            {"clave": "Vitamina D",       "valor": "12 µg / 100 g"},
            {"clave": "Envase",           "valor": "Lata de hojalata (tapa fácil)"},
            {"clave": "Alérgenos",        "valor": "Pescado. Puede contener trazas de soya."},
        ],
    ),
    "P009": (
        "La Pasta Spaghetti 200g está elaborada con sémola de trigo durum de alta calidad, "
        "lo que le confiere una textura firme al dente y gran resistencia a la sobrecocción. "
        "De color amarillo dorado intenso por su alto contenido de carotenoides naturales del "
        "trigo. Tiempo de cocción de 8 a 10 minutos en agua hirviendo con sal. Versátil: "
        "perfecta para carbonara, boloñesa, al pesto, aglio e olio y todo tipo de salsas.",
        [
            {"clave": "Contenido neto",  "valor": "200 g"},
            {"clave": "Ingrediente",     "valor": "Sémola de trigo durum 100%"},
            {"clave": "Proteínas",       "valor": "13 g / 100 g"},
            {"clave": "Carbohidratos",   "valor": "70 g / 100 g"},
            {"clave": "Tiempo de cocción","valor": "8-10 minutos"},
            {"clave": "Grosor",          "valor": "2 mm de diámetro"},
            {"clave": "Índice glucémico","valor": "Medio (IG ~45 al dente)"},
            {"clave": "Alérgenos",       "valor": "Contiene gluten (trigo)"},
        ],
    ),
    "P010": (
        "Las Galletas Marías 200g son las galletas de vainilla más icónicas de México, "
        "elaboradas con harina de trigo, azúcar y esencia natural de vainilla. Crujientes y "
        "ligeramente dulces, perfectas para acompañar el café o el té de la mañana, hacer "
        "pay de queso, carlota de limón, gelatinas y postres tradicionales. Sin colorantes "
        "artificiales. El sabor de siempre en la despensa de cada hogar mexicano.",
        [
            {"clave": "Contenido neto",   "valor": "200 g (~32 galletas)"},
            {"clave": "Sabor",            "valor": "Vainilla natural"},
            {"clave": "Calorías",         "valor": "430 kcal / 100 g"},
            {"clave": "Azúcares",         "valor": "22 g / 100 g"},
            {"clave": "Grasas saturadas", "valor": "4 g / 100 g"},
            {"clave": "Diámetro aprox.",  "valor": "6 cm"},
            {"clave": "Empaque",          "valor": "Bolsa resellable"},
            {"clave": "Alérgenos",        "valor": "Gluten (trigo), huevo, leche"},
        ],
    ),
    "P011": (
        "El Refresco Cola 600ml es una bebida carbonatada refrescante de sabor cola con agua "
        "filtrada, azúcar y extractos naturales de plantas aromáticas y cítricos. Temperatura "
        "ideal de consumo: entre 2 y 6 °C. Presentación de 600 ml en botella PET individual, "
        "perfecta para llevar. Sin cafeína excesiva. Apta para mayores de 12 años. Mantenla "
        "refrigerada después de abrir y consúmela en el día.",
        [
            {"clave": "Contenido neto",  "valor": "600 ml"},
            {"clave": "Tipo",            "valor": "Bebida carbonatada sabor cola"},
            {"clave": "Azúcar",          "valor": "10.6 g / 100 ml"},
            {"clave": "Calorías",        "valor": "42 kcal / 100 ml"},
            {"clave": "Cafeína",         "valor": "10 mg / 100 ml"},
            {"clave": "Carbonatación",   "valor": "3.7 volúmenes de CO₂"},
            {"clave": "Envase",          "valor": "Botella PET 600 ml"},
            {"clave": "Temperatura servicio", "valor": "2 – 6 °C"},
        ],
    ),
    "P012": (
        "El Agua Natural 1.5 lt pasa por un proceso de 7 etapas de purificación que incluye "
        "filtración por carbón activado, osmosis inversa y ozonización para garantizar "
        "pureza microbiológica y sabor neutro. Sin sodio añadido. Certificada por las normas "
        "NOM-201-SSA1 y NOM-127-SSA1. Envase PET ligero y resistente. Perfecta para hidratarse "
        "en cualquier momento del día, en casa, oficina, gym o al aire libre.",
        [
            {"clave": "Contenido neto",   "valor": "1.5 litros"},
            {"clave": "Proceso de purificación", "valor": "7 etapas: filtración + O.I. + ozonización"},
            {"clave": "pH",               "valor": "6.5 – 7.5"},
            {"clave": "Sodio",            "valor": "< 5 mg / L"},
            {"clave": "Solidos disueltos","valor": "< 10 ppm"},
            {"clave": "Envase",           "valor": "PET 100% reciclable"},
            {"clave": "Norma",            "valor": "NOM-201-SSA1 / NOM-127-SSA1"},
            {"clave": "Calorías",         "valor": "0 kcal"},
        ],
    ),
    "P013": (
        "El Jugo de Naranja 1lt está elaborado con naranjas Valencia de los valles de Nuevo "
        "León y Veracruz, prensadas en frío y pasteurizadas en menos de 24 horas para "
        "preservar el máximo de vitamina C, flavonoides y sabor fresco. Sin conservadores, "
        "sin colorantes y sin azúcar añadida. 100% puro jugo. Una porción de 240 ml cubre "
        "el 120% del requerimiento diario de vitamina C.",
        [
            {"clave": "Contenido neto",  "valor": "1 litro"},
            {"clave": "Tipo",            "valor": "Jugo 100% natural sin azúcar añadida"},
            {"clave": "Naranja",         "valor": "Valencia prensada en frío"},
            {"clave": "Vitamina C",      "valor": "50 mg / 100 ml"},
            {"clave": "Azúcar natural",  "valor": "8.4 g / 100 ml (fructosa natural)"},
            {"clave": "Calorías",        "valor": "45 kcal / 100 ml"},
            {"clave": "Conservación",    "valor": "Refrigerar al abrir, consumir en 5 días"},
            {"clave": "Sin aditivos",    "valor": "Sin conservadores ni colorantes"},
        ],
    ),
    "P014": (
        "La Leche Entera 1lt es leche de vaca fresca, pasteurizada y homogeneizada, con "
        "su contenido natural de grasa (mín. 3.25%) para aportar vitaminas liposolubles A, D "
        "y E. Fuente excelente de calcio (120 mg / 100 ml) y proteínas de alto valor biológico. "
        "Ideal para tomarse sola, en café, licuados, atoles y para cocinar. Proceso UHT "
        "garantiza vida de anaquel sin refrigeración hasta abrirla.",
        [
            {"clave": "Contenido neto",   "valor": "1 litro"},
            {"clave": "Tipo",             "valor": "Leche entera UHT pasteurizada"},
            {"clave": "Grasa",            "valor": "Mín. 3.25% (32 g / litro)"},
            {"clave": "Proteínas",        "valor": "3.2 g / 100 ml"},
            {"clave": "Calcio",           "valor": "120 mg / 100 ml"},
            {"clave": "Vitamina D",       "valor": "Adicionada (1.0 µg / 100 ml)"},
            {"clave": "Calorías",         "valor": "61 kcal / 100 ml"},
            {"clave": "Alérgenos",        "valor": "Contiene lactosa y proteínas de leche"},
        ],
    ),
    "P015": (
        "El Café Soluble 200g es un café instantáneo 100% arábica, liofilizado para "
        "conservar los aceites esenciales y aromas del café fresco. Proceso de secado por "
        "congelación (freeze-dry) que captura las notas tostadas, el cuerpo y el aroma "
        "característico. Se disuelve al instante en agua caliente o fría. Rendimiento "
        "aproximado: 100 tazas por envase de 200 g. Sin azúcar añadida.",
        [
            {"clave": "Contenido neto",  "valor": "200 g"},
            {"clave": "Tipo de café",    "valor": "100% Arábica liofilizado (freeze-dry)"},
            {"clave": "Cafeína",         "valor": "~60 mg / taza (180 ml)"},
            {"clave": "Dosis recomendada","valor": "2 g por taza (1 cucharadita)"},
            {"clave": "Rendimiento",     "valor": "~100 tazas por envase"},
            {"clave": "Calorías",        "valor": "2 kcal / taza (sin leche ni azúcar)"},
            {"clave": "Envase",          "valor": "Frasco de vidrio hermético"},
            {"clave": "Conservación",    "valor": "Lugar fresco y seco, cerrado herméticamente"},
        ],
    ),
    "P016": (
        "El Detergente Líquido 1lt es una fórmula concentrada con tensioactivos de origen "
        "vegetal y enzimas proteolíticas que eliminan manchas difíciles de grasa, barro, "
        "hierba y alimentos desde la primera lavada, incluso en agua fría. Compatible con "
        "lavadoras automáticas y lavado a mano. Suave con las telas, no daña colores ni "
        "fibras delicadas. Fragancias: lavanda o brisa del mar.",
        [
            {"clave": "Contenido neto",   "valor": "1 litro"},
            {"clave": "Tipo",             "valor": "Detergente líquido concentrado"},
            {"clave": "Tensioactivos",    "valor": "Origen vegetal (>15% aniónicos)"},
            {"clave": "Enzimas",          "valor": "Proteasas y lipasas"},
            {"clave": "Temperatura",      "valor": "Eficaz desde 20 °C"},
            {"clave": "Dosis",            "valor": "30 ml por carga normal"},
            {"clave": "Rendimiento",      "valor": "~33 lavadas por litro"},
            {"clave": "Fragancias",       "valor": "Lavanda / Brisa del Mar"},
        ],
    ),
    "P017": (
        "El Jabón en Polvo 1kg es un detergente en polvo de alta espuma con tecnología "
        "bioenzimática que descompone proteínas, grasas y almidones para dejar tu ropa "
        "impecable y con aroma duradero. Incluye componentes blanqueadores ópticos que "
        "avivan los blancos y realzan los colores. Apto para lavadora de carga superior, "
        "carga frontal y lavado a mano. Fórmula biodegradable.",
        [
            {"clave": "Contenido neto",  "valor": "1 kg"},
            {"clave": "Tipo",            "valor": "Polvo con blanqueador óptico y enzimas"},
            {"clave": "Tensioactivos",   "valor": "15-30% (sulfato de alquilo)"},
            {"clave": "Temperatura",     "valor": "Eficaz de 30 °C a 60 °C"},
            {"clave": "Dosis lavadora",  "valor": "60 g por carga (cubeta incluida)"},
            {"clave": "Rendimiento",     "valor": "~16 lavadas por kilo"},
            {"clave": "Biodegradable",   "valor": "Sí, >90% de ingredientes activos"},
            {"clave": "Apto para",       "valor": "Ropa blanca y de color"},
        ],
    ),
    "P018": (
        "El Suavizante de Ropa 1lt deja las fibras de las telas suaves, esponjosas y con "
        "fragancia que dura hasta 7 días. Su fórmula con microcápsulas de perfume libera "
        "olor fresco cada vez que la ropa se mueve. Reduce la electricidad estática y "
        "facilita el planchado. Apto para toda la familia, incluida ropa de bebé (fragancia "
        "sin alcohol). Se agrega al enjuague final de la lavadora o al lavado a mano.",
        [
            {"clave": "Contenido neto",  "valor": "1 litro"},
            {"clave": "Función",         "valor": "Suavizante y antiestático"},
            {"clave": "Tecnología",      "valor": "Microcápsulas de perfume de larga duración"},
            {"clave": "Duración del aroma","valor": "Hasta 7 días"},
            {"clave": "Apto para",       "valor": "Toda la familia, incluyendo ropa de bebé"},
            {"clave": "Dosis",           "valor": "50 ml por carga (lavadora)"},
            {"clave": "Rendimiento",     "valor": "~20 lavadas por litro"},
            {"clave": "Alcohol",         "valor": "Sin alcohol (fragancias infantiles)"},
        ],
    ),
    "P019": (
        "El Limpiavidrios 500ml es una fórmula con tensioactivos y alcohol isopropílico "
        "que limpia y abrillanta cristales, ventanas, espejos y superficies brillantes sin "
        "dejar rayas ni residuo blanquecino. Acción antiestática que repele el polvo hasta "
        "72 horas después de la limpieza. Aroma neutro. Listo para usar: rocía sobre la "
        "superficie y frota con paño de microfibra o papel periódico.",
        [
            {"clave": "Contenido neto",  "valor": "500 ml"},
            {"clave": "Superficie",      "valor": "Vidrios, espejos, cristales y plásticos brillantes"},
            {"clave": "Alcohol isopropílico", "valor": "10%"},
            {"clave": "Antiestático",    "valor": "Repele polvo hasta 72 horas"},
            {"clave": "Presentación",    "valor": "Pistola atomizadora incluida"},
            {"clave": "Aroma",           "valor": "Neutro / sin fragancia"},
            {"clave": "Sin enjuague",    "valor": "Sí, uso directo"},
            {"clave": "pH",              "valor": "7 – 8 (neutro)"},
        ],
    ),
    "P020": (
        "El Cloro 1lt es hipoclorito de sodio al 6% de concentración, aprobado para "
        "desinfección de superficies, pisos, sanitarios, ropa blanca y purificación de "
        "agua para consumo (2 gotas por litro). Elimina el 99.9% de bacterias, virus y "
        "hongos en 10 minutos de contacto. Para uso doméstico e industrial. Mantener en "
        "lugar fresco y oscuro, fuera del alcance de niños.",
        [
            {"clave": "Contenido neto",    "valor": "1 litro"},
            {"clave": "Principio activo",  "valor": "Hipoclorito de sodio 6%"},
            {"clave": "Eficacia",          "valor": "99.9% bacterias, virus y hongos"},
            {"clave": "Tiempo de contacto","valor": "10 minutos (superficies)"},
            {"clave": "Dosis desinfección","valor": "1 parte cloro + 9 partes agua"},
            {"clave": "Dosis purificación agua", "valor": "2 gotas / litro de agua"},
            {"clave": "pH",                "valor": "12 – 13 (alcalino)"},
            {"clave": "Precaución",        "valor": "No mezclar con ácidos ni amoníaco"},
        ],
    ),
    "P021": (
        "El Shampoo 400ml está formulado con keratina hidrolizada y pantenol (provitamina B5) "
        "para fortalecer el cabello desde la raíz, reducir la rotura y aportar brillo intenso. "
        "Sin sulfatos agresivos (SLS-free), por lo que es suave para uso diario y apto para "
        "cabello teñido o con tratamiento químico. pH balanceado 5.5. Fragancia floral-frutada "
        "de larga duración. Apto para todos los tipos de cabello.",
        [
            {"clave": "Contenido neto",  "valor": "400 ml"},
            {"clave": "Activos",         "valor": "Keratina hidrolizada + Pantenol (B5)"},
            {"clave": "Sin sulfatos",    "valor": "SLS-Free / SLES-Free"},
            {"clave": "pH",              "valor": "5.5 (balanceado)"},
            {"clave": "Tipo de cabello", "valor": "Todos los tipos, incluyendo teñido"},
            {"clave": "Fragancia",       "valor": "Floral-frutada de larga duración"},
            {"clave": "Uso",             "valor": "Diario"},
            {"clave": "Alérgenos",       "valor": "Sin parabenos ni colorantes artificiales"},
        ],
    ),
    "P022": (
        "El Jabón de Tocador 150g es una pastilla de jabón sólido con glicerina natural y "
        "extracto de aloe vera que limpia suavemente sin resecar la piel. Su pH neutro "
        "(5.5-6.5) respeta la barrera natural de la dermis. La glicerina actúa como "
        "humectante, dejando la piel suave y sedosa después de cada lavado. Disponible en "
        "fragancias: fresca, lavanda y original. Para toda la familia.",
        [
            {"clave": "Contenido neto",  "valor": "150 g"},
            {"clave": "Activos",         "valor": "Glicerina natural + Extracto de Aloe Vera"},
            {"clave": "pH",              "valor": "5.5 – 6.5 (neutro-ácido)"},
            {"clave": "Tipo de piel",    "valor": "Normal, seca y sensible"},
            {"clave": "Formato",         "valor": "Pastilla sólida"},
            {"clave": "Fragancias",      "valor": "Fresca / Lavanda / Original"},
            {"clave": "Sin",             "valor": "Sin parabenos, sin triclosan"},
            {"clave": "Uso",             "valor": "Cara y cuerpo, toda la familia"},
        ],
    ),
    "P023": (
        "La Pasta Dental 75ml con flúor (1450 ppm) ofrece protección completa contra caries, "
        "sarro, sensibilidad dental y mal aliento. Su fórmula con hidróxido de aluminio "
        "blanquea suavemente el esmalte sin dañarlo. El flúor forma un escudo protector "
        "en los dientes que refuerza el esmalte mineralizado. Sabor menta fresca intensa. "
        "Apta para adultos y jóvenes mayores de 12 años.",
        [
            {"clave": "Contenido neto",  "valor": "75 ml"},
            {"clave": "Flúor",           "valor": "1450 ppm (fluoruro de sodio)"},
            {"clave": "Beneficios",      "valor": "Anticaries, antisarro, blanqueadora, antihalitosis"},
            {"clave": "Sabor",           "valor": "Menta fresca intensa"},
            {"clave": "Abrasividad",     "valor": "Baja (RDA 70) – suave con el esmalte"},
            {"clave": "Dosis",           "valor": "Hilo de pasta de 1.5 cm"},
            {"clave": "Apto para",       "valor": "Adultos y mayores de 12 años"},
            {"clave": "Certificación",   "valor": "Aprobada por asociaciones odontológicas"},
        ],
    ),
    "P024": (
        "El Desodorante Roll-on 60ml ofrece protección antitranspirante de 48 horas con "
        "fórmula que combina sales de aluminio (clorohidrato de aluminio al 20%) que bloquean "
        "los poros sudoríparos con activos calmantes como aloe vera y vitamina E. Aplicación "
        "líquida, se seca rápido, no mancha la ropa. Sin alcohol. Fragancia duradera. "
        "Apto para piel sensible, dermatológicamente testeado.",
        [
            {"clave": "Contenido neto",  "valor": "60 ml"},
            {"clave": "Tipo",            "valor": "Antitranspirante y desodorante"},
            {"clave": "Protección",      "valor": "48 horas"},
            {"clave": "Principio activo","valor": "Clorohidrato de aluminio 20%"},
            {"clave": "Activos calmantes","valor": "Aloe Vera + Vitamina E"},
            {"clave": "Sin alcohol",     "valor": "Sí, libre de alcohol"},
            {"clave": "Piel sensible",   "valor": "Sí, dermatológicamente probado"},
            {"clave": "Mancha ropa",     "valor": "No mancha (fórmula transparente)"},
        ],
    ),
    "P025": (
        "El Papel Higiénico 4 rollos es papel suave triple hoja con tecnología de gofrado "
        "que proporciona mayor suavidad, resistencia húmeda y absorción. Cada rollo contiene "
        "250 hojas dobles (500 ml absorbidos por rollo). Papel sin tintas ni perfumes "
        "artificiales, hipoalergénico. Fabricado con 40% de fibra reciclada y 60% de fibra "
        "virgen certificada FSC. Desintegración rápida, no obstruye tuberías.",
        [
            {"clave": "Rollos por paquete", "valor": "4 rollos"},
            {"clave": "Hojas por rollo",    "valor": "250 hojas dobles"},
            {"clave": "Capas",              "valor": "Triple hoja con gofrado"},
            {"clave": "Ancho hoja",         "valor": "10 cm × 10 cm"},
            {"clave": "Material",           "valor": "60% fibra virgen FSC + 40% reciclada"},
            {"clave": "Sin",                "valor": "Sin tintas ni perfumes artificiales"},
            {"clave": "Hipoalergénico",     "valor": "Sí"},
            {"clave": "Desintegración",     "valor": "Rápida, apto para todo tipo de tuberías"},
        ],
    ),
    "P026": (
        "Las Servilletas 200 piezas son servilletas de papel de doble hoja con acabado "
        "suave al tacto. Plegado cuádruple (23 × 23 cm abiertas) con alta capacidad "
        "absorbente, ideales para mesa, barra, cocina y eventos. Papel blanco prístino "
        "sin blanqueadores ópticos agresivos. Empaque con ventana transparente para "
        "visualizar el producto. Papel libre de cloro elemental (ECF).",
        [
            {"clave": "Cantidad",        "valor": "200 piezas"},
            {"clave": "Dimensión abierta","valor": "23 × 23 cm"},
            {"clave": "Capas",           "valor": "Doble hoja"},
            {"clave": "Plegado",         "valor": "Cuádruple"},
            {"clave": "Color",           "valor": "Blanco"},
            {"clave": "Blanqueo",        "valor": "ECF (libre de cloro elemental)"},
            {"clave": "Absorción",       "valor": "Alta (prueba TAPPI T461)"},
            {"clave": "Empaque",         "valor": "Bolsa con ventana transparente"},
        ],
    ),
    "P027": (
        "Las Bolsas para Basura 10 piezas están fabricadas en polietileno de alta densidad "
        "(HDPE) con refuerzo en la base y costuras termoselladas de doble traslape para "
        "máxima resistencia a desgarres y perforaciones. Capacidad de 60 litros. Color "
        "negro para opacidad total. El cierre tipo lazo facilita amarrar la bolsa sin "
        "derrames. Compatibles con botes de basura estándar de cocina y oficina.",
        [
            {"clave": "Cantidad",        "valor": "10 piezas"},
            {"clave": "Capacidad",       "valor": "60 litros"},
            {"clave": "Material",        "valor": "Polietileno de alta densidad (HDPE)"},
            {"clave": "Grosor",          "valor": "25 micras"},
            {"clave": "Dimensiones",     "valor": "70 cm × 90 cm"},
            {"clave": "Color",           "valor": "Negro opaco"},
            {"clave": "Cierre",          "valor": "Tipo lazo integrado"},
            {"clave": "Costuras",        "valor": "Termoselladas doble traslape"},
        ],
    ),
    "P028": (
        "El Foco LED 10W es una lámpara de estado sólido con tecnología SMD de última "
        "generación que reemplaza focos incandescentes de 75W con un ahorro energético "
        "del 87%. Emite 800 lúmenes de luz blanca cálida (3000K) con CRI > 80 para "
        "reproducción fiel de colores. Vida útil de 25,000 horas (más de 22 años a "
        "3 horas diarias). Base E27 universal. Compatible con voltaje 85-265V.",
        [
            {"clave": "Potencia",         "valor": "10 W"},
            {"clave": "Equivalente a",    "valor": "Foco incandescente 75 W"},
            {"clave": "Flujo luminoso",   "valor": "800 lúmenes"},
            {"clave": "Temperatura de color", "valor": "3000 K (blanca cálida)"},
            {"clave": "CRI",              "valor": "> 80"},
            {"clave": "Vida útil",        "valor": "25,000 horas"},
            {"clave": "Base",             "valor": "E27 (universal)"},
            {"clave": "Voltaje",          "valor": "85 – 265 V (universal)"},
            {"clave": "Ahorro energético","valor": "87% vs incandescente"},
        ],
    ),
    "P029": (
        "Las Pilas AA 4-pack son pilas alcalinas de alta capacidad con tecnología PowerSeal "
        "que garantizan potencia constante hasta el último momento de uso, sin la caída de "
        "voltaje típica de las pilas de carbono. Resistentes a la corrosión y con garantía "
        "de almacenamiento hasta 10 años sin perder carga. Ideales para controles remotos, "
        "juguetes, linternas, relojes de pared, ratones inalámbricos y cámaras digitales.",
        [
            {"clave": "Cantidad",        "valor": "4 pilas AA (LR6)"},
            {"clave": "Tipo",            "valor": "Alcalinas de alta capacidad"},
            {"clave": "Voltaje",         "valor": "1.5 V por pila"},
            {"clave": "Capacidad",       "valor": "2850 mAh"},
            {"clave": "Vida de anaquel", "valor": "10 años (sin usar)"},
            {"clave": "Temperatura de uso", "valor": "-18 °C a +55 °C"},
            {"clave": "Resistencia a corrosión", "valor": "Sí (PowerSeal)"},
            {"clave": "Uso recomendado", "valor": "Dispositivos de alto consumo"},
        ],
    ),
    "P030": (
        "La Escoba con Cepillo es un kit de limpieza completo que incluye escoba con "
        "cerdas de polipropileno de doble dureza (suaves en el exterior para no rayar "
        "pisos y duras en el interior para arrastrar polvo fino) más recogedor de plástico "
        "ABS resistente con labio de goma para un contacto perfecto con el piso. "
        "Mango telescópico de aluminio ajustable de 90 a 130 cm. Apta para cualquier "
        "tipo de piso: cerámica, mármol, madera, concreto.",
        [
            {"clave": "Incluye",         "valor": "Escoba + Recogedor"},
            {"clave": "Cerdas",          "valor": "Polipropileno doble dureza"},
            {"clave": "Ancho barrido",   "valor": "28 cm"},
            {"clave": "Mango",           "valor": "Aluminio telescópico"},
            {"clave": "Longitud ajustable", "valor": "90 – 130 cm"},
            {"clave": "Recogedor",       "valor": "ABS con labio de goma"},
            {"clave": "Tipos de piso",   "valor": "Cerámica, mármol, madera, concreto"},
            {"clave": "Color",           "valor": "Azul / Gris (puede variar)"},
        ],
    ),
}


class Command(BaseCommand):
    help = "Enriquece los productos demo con descripcion_larga y ficha_tecnica para la página de detalle del storefront"

    def add_arguments(self, parser):
        parser.add_argument(
            "--empresa-slug",
            default="demo-abarrotes",
            help="Slug de la empresa demo (default: demo-abarrotes)",
        )
        parser.add_argument(
            "--publica",
            action="store_true",
            default=True,
            help="Poner visibilidad_publica=publico_con_stock en todos los productos (default: True)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.core.models import Empresa
        from apps.inventory.models import Producto
        from apps.storefront.models import ConfiguracionStorefront

        slug = options["empresa_slug"]

        try:
            empresa = Empresa.objects.get(slug=slug)
        except Empresa.DoesNotExist:
            self.stdout.write(self.style.ERROR(
                f"❌ No se encontró ninguna empresa con slug='{slug}'. "
                f"Ejecuta primero: python manage.py seed"
            ))
            return

        self.stdout.write(self.style.WARNING(
            f"🏪 Enriqueciendo productos de: {empresa.nombre}"
        ))

        actualizados = 0
        sin_datos = []

        for codigo, (desc_larga, ficha) in DETALLE_PRODUCTOS.items():
            try:
                p = Producto.objects.get(empresa=empresa, codigo=codigo)
            except Producto.DoesNotExist:
                sin_datos.append(codigo)
                continue

            p.descripcion_larga = desc_larga
            p.ficha_tecnica     = ficha
            if options["publica"]:
                p.visibilidad_publica = "publico_con_stock"
            # Forzar regeneración de slug si está vacío
            if not p.slug:
                p._generar_slug()
            p.save()
            actualizados += 1
            self.stdout.write(f"  ✓ {codigo} — {p.nombre}")

        # Activar pagina_detalle_activa en el storefront de la empresa
        config, created = ConfiguracionStorefront.objects.get_or_create(
            empresa=empresa,
            defaults={
                "slug":         empresa.slug,
                "nombre_tienda": empresa.nombre_comercial or empresa.nombre,
                "activo":       True,
            },
        )
        if not config.pagina_detalle_activa:
            config.pagina_detalle_activa = True
            config.save(update_fields=["pagina_detalle_activa"])
            self.stdout.write(
                f"\n  ✓ ConfiguracionStorefront: pagina_detalle_activa=True activado"
            )
        else:
            self.stdout.write(
                f"\n  ✓ ConfiguracionStorefront: pagina_detalle_activa ya estaba activo"
            )

        # Generar slugs de cualquier producto que aún no tenga
        sin_slug = Producto.objects.filter(empresa=empresa, slug="")
        for p in sin_slug:
            p._generar_slug()
            p.save(update_fields=["slug"])
        if sin_slug.count():
            self.stdout.write(f"  ✓ {sin_slug.count()} slugs generados en otros productos")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"✅ {actualizados} productos enriquecidos con descripción larga y ficha técnica."
        ))
        if sin_datos:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Códigos no encontrados (¿corriste el seed?): {', '.join(sin_datos)}"
            ))
        self.stdout.write("")
        self.stdout.write("  Para aplicar en Docker:")
        self.stdout.write("  docker compose exec backend python manage.py seed_storefront_detalle")
