-- Extra fields for real job applications

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS resume_file_name TEXT,
  ADD COLUMN IF NOT EXISTS applicant_phone TEXT;
