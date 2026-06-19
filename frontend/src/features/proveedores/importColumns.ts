import type { ImportColumn } from '@/components/common/ImportModal/ImportModal'

// Debe coincidir con backend/apps/terceros/import_specs.py (_COLUMNAS_PROVEEDOR)
export const PROVEEDOR_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'nombre_comercial', label: 'Nombre comercial', required: true, width: 160 },
  { key: 'razon_social',     label: 'Razón social', width: 160 },
  { key: 'rfc',              label: 'RFC', width: 110 },
  { key: 'tipo_persona',     label: 'Persona', type: 'select', options: ['fisica', 'moral'], width: 90 },
  { key: 'tipo_proveedor',   label: 'Tipo', type: 'select', options: ['materia_prima', 'servicios', 'equipos', 'consumibles', 'otro'], width: 130 },
  { key: 'codigo',           label: 'Código', width: 90 },
  { key: 'email',            label: 'Correo', width: 150 },
  { key: 'telefono',         label: 'Teléfono', width: 110 },
  { key: 'celular',          label: 'Celular', width: 110 },
  { key: 'contacto_principal', label: 'Contacto', width: 130 },
  { key: 'sitio_web',        label: 'Sitio web', width: 130 },
  { key: 'calle',            label: 'Calle', width: 130 },
  { key: 'numero_exterior',  label: 'No. ext', width: 70 },
  { key: 'numero_interior',  label: 'No. int', width: 70 },
  { key: 'colonia',          label: 'Colonia', width: 110 },
  { key: 'codigo_postal',    label: 'CP', width: 70 },
  { key: 'ciudad',           label: 'Ciudad', width: 110 },
  { key: 'estado',           label: 'Estado', width: 110 },
  { key: 'pais',             label: 'País', width: 90 },
  { key: 'dias_credito',     label: 'Días créd.', type: 'number', width: 80 },
  { key: 'descuento_pronto_pago', label: 'Desc. P.P. (%)', type: 'number', width: 90 },
  { key: 'dias_pronto_pago', label: 'Días P.P.', type: 'number', width: 80 },
  { key: 'notas',            label: 'Notas', width: 150 },
]
