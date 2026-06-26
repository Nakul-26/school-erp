export interface SystemSetting {
  id: string;
  institution_id: string;
  category: string;
  setting_key: string;
  setting_value: string; // JSON or flat value
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface SaveSettingsInput {
  settings: Array<{
    category: string;
    setting_key: string;
    setting_value: string;
  }>;
}
