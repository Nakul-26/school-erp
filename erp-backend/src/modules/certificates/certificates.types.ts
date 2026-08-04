export type CertificateType = 'ID_CARD' | 'BONAFIDE' | 'TRANSFER_CERTIFICATE' | 'CUSTOM';

export interface CertificateTemplate {
  id: string;
  institution_id: string;
  name: string;
  type: CertificateType;
  body_html: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  type?: CertificateType;
  body_html: string;
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export interface CertificateIssuance {
  id: string;
  institution_id: string;
  template_id: string;
  student_id: string;
  reference_number: string;
  rendered_html: string;
  issued_by: string | null;
  issued_at: string;

  template_name?: string;
  student_name?: string;
}

export interface RenderedCertificate {
  issuance_id: string;
  reference_number: string;
  html: string;
}
