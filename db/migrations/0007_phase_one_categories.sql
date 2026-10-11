PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO article_categories (id, name, slug, description) VALUES
('cat-general', 'General', 'general', 'General DTECHNURSE articles and updates'),
('cat-nursing-fundamentals', 'Nursing Fundamentals', 'nursing-fundamentals', 'Foundational nursing knowledge and practice'),
('cat-digital-health', 'Digital Health', 'digital-health', 'Digital tools and innovation in healthcare'),
('cat-health-informatics', 'Health Informatics', 'health-informatics', 'Health data, information systems, and workflows'),
('cat-ai-healthcare', 'Artificial Intelligence in Healthcare', 'artificial-intelligence-in-healthcare', 'AI applications, benefits, and responsible use in healthcare'),
('cat-patient-monitoring', 'Patient Monitoring Technology', 'patient-monitoring-technology', 'Devices and systems used to monitor patients'),
('cat-ehr', 'Electronic Health Records', 'electronic-health-records', 'Electronic records and clinical documentation'),
('cat-telehealth', 'Telehealth', 'telehealth', 'Remote care, virtual visits, and connected care'),
('cat-medical-devices', 'Medical Devices', 'medical-devices', 'Medical equipment and connected devices'),
('cat-nursing-research', 'Nursing Research', 'nursing-research', 'Evidence-based practice and nursing research'),
('cat-career-development', 'Career Development', 'career-development', 'Nursing careers, skills, and professional growth'),
('cat-news', 'News', 'news', 'News and updates relevant to nursing and digital health');
