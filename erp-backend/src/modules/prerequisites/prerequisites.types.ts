export interface PrerequisiteLink {
  id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  prerequisite_subject_id: string;
  prerequisite_code: string;
  prerequisite_name: string;
}

export interface CreatePrerequisiteInput {
  subject_id: string;
  prerequisite_subject_id: string;
}

export interface PrerequisiteEligibility {
  prerequisite_subject_id: string;
  prerequisite_code: string;
  prerequisite_name: string;
  is_met: boolean;
  latest_grade: string | null;
  latest_percent: number | null;
}

export interface SubjectEligibility {
  subject_id: string;
  is_eligible: boolean;
  prerequisites: PrerequisiteEligibility[];
}
