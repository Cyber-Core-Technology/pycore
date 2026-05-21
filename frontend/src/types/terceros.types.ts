export type TipoPersona = 'fisica' | 'moral'
export type TipoCliente = 'minorista' | 'mayorista' | 'distribuidor'

export type OrigenCliente = 'erp' | 'storefront'

export interface ClienteLista {
  id:                string
  codigo:            string
  nombre_comercial:  string
  rfc:               string
  email:             string
  telefono:          string
  tipo_cliente:      TipoCliente | ''
  limite_credito:    string
  credito_disponible: string
  activo:            boolean
  origen:            OrigenCliente
}

export interface Cliente extends ClienteLista {
  tipo_persona:            TipoPersona
  razon_social:            string
  regimen_fiscal:          string
  celular:                 string
  sitio_web:               string
  calle:                   string
  numero_exterior:         string
  numero_interior:         string
  colonia:                 string
  codigo_postal:           string
  ciudad:                  string
  estado:                  string
  pais:                    string
  dias_credito:            number
  descuento_predeterminado: string
  notas:                   string
  tiene_credito:           boolean
  created_at:              string
}

export interface ClienteFiltros {
  q?:           string
  tipo_cliente?: TipoCliente
  activo?:      boolean
}

export interface ClienteFormData {
  codigo?:                  string
  tipo_persona:             TipoPersona
  nombre_comercial:         string
  razon_social?:            string
  rfc?:                     string
  regimen_fiscal?:          string
  email?:                   string
  telefono?:                string
  celular?:                 string
  sitio_web?:               string
  calle?:                   string
  numero_exterior?:         string
  numero_interior?:         string
  colonia?:                 string
  codigo_postal?:           string
  ciudad?:                  string
  estado?:                  string
  pais?:                    string
  limite_credito?:          number
  dias_credito?:            number
  tipo_cliente?:            TipoCliente | ''
  descuento_predeterminado?: number
  notas?:                   string
}
