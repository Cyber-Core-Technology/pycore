export type TipoPersonaP = 'fisica' | 'moral'
export type TipoProveedor = 'materia_prima' | 'servicios' | 'equipos' | 'consumibles' | 'otro'

export interface ProveedorLista {
  id:                 string
  codigo:             string
  nombre_comercial:   string
  rfc:                string
  email:              string
  telefono:           string
  contacto_principal: string
  tipo_proveedor:     TipoProveedor | ''
  dias_credito:       number
  activo:             boolean
}

export interface Proveedor extends ProveedorLista {
  tipo_persona:           TipoPersonaP
  razon_social:           string
  celular:                string
  sitio_web:              string
  calle:                  string
  numero_exterior:        string
  numero_interior:        string
  colonia:                string
  codigo_postal:          string
  ciudad:                 string
  estado:                 string
  pais:                   string
  descuento_pronto_pago:  string
  dias_pronto_pago:       number
  notas:                  string
  created_at:             string
}

export interface ProveedorFiltros {
  q?:             string
  tipo_proveedor?: TipoProveedor
}

export interface ProveedorFormData {
  codigo?:                string
  tipo_persona:           TipoPersonaP
  nombre_comercial:       string
  razon_social?:          string
  rfc?:                   string
  email?:                 string
  telefono?:              string
  celular?:               string
  sitio_web?:             string
  contacto_principal?:    string
  calle?:                 string
  numero_exterior?:       string
  numero_interior?:       string
  colonia?:               string
  codigo_postal?:         string
  ciudad?:                string
  estado?:                string
  pais?:                  string
  dias_credito?:          number
  descuento_pronto_pago?: number
  dias_pronto_pago?:      number
  tipo_proveedor?:        TipoProveedor | ''
  notas?:                 string
}
