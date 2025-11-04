# SkillForge - Core User Stories and Workflow Walkthroughs

## Overview

SkillForge supports several primary user groups, each with distinct goals and workflows. Below are representative use cases and workflow walkthroughs to demonstrate how students, workforce professionals, and career advisors use the platform.

---

## 1. Students

### Core Goals

- Discover suitable career paths matching their current education and skills
- Understand skill gaps for target roles and identify ways to close them
- Plan educational steps to maximize employability and earning potential

### Workflow Walkthrough

**Steps:**

1. **Signup/Onboarding:** A student creates an account, fills out their profile (education, experience, interests), and completes an initial skill self-assessment.
2. **Explore Careers:** Student browses or searches for occupations that match their education and skill set, viewing detailed job data (description, salary, growth, skill requirements).
3. **Skill Gap Analysis:** Platform compares student's skill inventory to desired occupation, highlights missing competencies, and recommends courses/certifications to bridge gaps.
4. **Pathway Planning:** Student builds a personalized career plan, visualizing steps required to reach their target job and reviewing estimated timelines and salary outcomes.
5. **Progress Tracking:** Student tracks skill acquisition and pathway milestones via an interactive dashboard.

**Example Story:**

- Sarah, a college junior majoring in psychology, wants to pursue data analysis. SkillForge helps her identify her transferable skills, highlights gaps in technical proficiencies, and suggests a sequence of courses/certifications (e.g., Python, data visualization, statistics) to become job-ready.

---

## 2. Workforce Professionals (Career Changers & Incumbent Workers)

### Core Goals

- Identify new career paths leveraging existing experience and skills
- Minimize retraining by maximizing skill transferability
- Understand wage expectations and industry outlook for new fields
- Get actionable, personalized upskilling recommendations

### Workflow Walkthrough

**Steps:**

1. **Profile Import:** Professional imports or manually enters experience and skills. Resume parsing recommendation auto-populates skill categories.
2. **Career Match/Explore:** User discovers alternative occupations where their current skills are highly transferable. The system ranks jobs by match score, salary, and market demand.
3. **Gap Analysis:** The platform highlights additional skills and credentials required for target roles.
4. **Learning Path:** Professional receives curated upskilling plans, with direct links to online courses and timeframe/cost estimates.
5. **Progress Monitoring:** User tracks advancement towards new career goals and receives reminders for upcoming milestones.

**Example Story:**

- Miguel, a retail manager, wants to transition to project management. SkillForge maps retail leadership and communication skills to PM roles, reveals gaps (e.g., formal project planning, software tools), and suggests a learning roadmap to obtain PMP certification and related skills.

---

## 3. Career Advisors

### Core Goals

- Provide data-driven, personalized guidance to advisees
- Efficiently manage multiple client profiles and monitor progress
- Generate detailed career reports and actionable recommendations

### Workflow Walkthrough

**Steps:**

1. **Client Portfolio Management:** Advisor accesses dashboards for each advisee, reviewing skills, interests, and historical activity.
2. **Assessment Assignment:** Advisor assigns assessments (skills, aptitude, interests) and reviews results.
3. **Recommendation Generation:** Advisor uses platform analytics to suggest pathways, courses, and experiential learning opportunities tailored to each client.
4. **Progress Review:** Advisor meets periodically with advisees to review progress and adjust career plans.
5. **Reporting & Export:** Advisor exports detailed action plans and reports for advising sessions or institutional tracking.

**Example Story:**

- Priya, a university career counselor, uses SkillForge to manage 50+ student clients. She reviews assessment data, creates tailored recommendation plans, and tracks each student's progress, exporting reports for university stakeholders.

---

## 4. General Workflow Features (All Users)

- **Onboarding:** Guided profile setup with resume import and skills inventory
- **Career Exploration:** Intelligent search and recommendations based on personal profile
- **Gap Analysis:** Automated identification of missing skills/experience for target jobs
- **Actionable Planning:** Step-by-step roadmap construction and export
- **Progress Dashboard:** Real-time tracking of milestones, skill acquisition, and goal achievement

---

## 5. Resume Import and Skill Extraction Workflow

### Overview

SkillForge's Resume Import and Skill Extraction feature streamlines the onboarding process by automatically parsing uploaded resumes and extracting relevant career information. This workflow leverages natural language processing (NLP) and integration with standardized occupational frameworks (JAAT/O*NET) to transform resume content into actionable career insights.

### Core Capabilities

- **Multi-Format Support:** Accepts PDF, DOCX, and plain text resume files
- **Intelligent Parsing:** Extracts education, work history, skills, certifications, and accomplishments using NLP
- **Skill Mapping:** Maps extracted skills to O*NET and JAAT taxonomies for standardized career matching
- **Auto-Population:** Pre-fills user profile with parsed information for review and editing
- **Gap Identification:** Compares extracted skills against target occupations to identify matched and missing competencies
- **Personalized Recommendations:** Generates upskilling pathways, course suggestions, and career trajectory options

### Workflow Steps

**1. Resume Upload**

- User navigates to profile setup or onboarding wizard
- Selects "Import Resume" option and uploads file (PDF/DOCX/TXT)
- System validates file format and initiates parsing process

**2. Backend Processing**

- NLP engine extracts structured data from unstructured resume text:
  - Contact information and demographics
  - Education history (degrees, institutions, dates)
  - Work experience (job titles, employers, dates, responsibilities)
  - Technical and soft skills mentioned throughout document
  - Certifications, awards, and professional development
- Extracted skills are normalized and mapped to O*NET skill categories and JAAT competency frameworks
- System identifies current occupation(s) based on work history and job titles

**3. Profile Auto-Fill**

- User profile is automatically populated with extracted information
- User reviews pre-filled data for accuracy
- User can edit, add, or remove any auto-populated fields
- Skill inventory is presented with proficiency suggestions based on context (e.g., years of experience)

**4. Skill Analysis**

- Platform compares extracted skills against user's stated career interests or current occupation
- **Matched Skills:** Highlights competencies user already possesses that align with target roles
- **Missing Skills:** Identifies critical gaps between current profile and desired career paths
- Visual skill match score shows percentage alignment with various occupations

**5. Career and Upskilling Recommendations**

- System generates personalized recommendations:
  - **Career Pathways:** Alternative or advanced roles leveraging existing skills
  - **Upskilling Plans:** Specific courses, certifications, or training to close skill gaps
  - **Wage Projections:** Expected salary ranges for recommended roles in user's location
  - **Timeline Estimates:** Projected time to achieve readiness for target positions

**6. Action Plan Creation**

- User reviews recommendations and selects preferred career goals
- Platform generates step-by-step action plan with milestones
- User can export plan or save to dashboard for ongoing tracking

### Example Use Case

**User Profile: James Thompson**

- **Background:** 5 years as a Customer Support Specialist at a SaaS company
- **Goal:** Transition into a Data Analyst role
- **Action:** Uploads resume to SkillForge

**Step-by-Step Experience:**

1. **Upload:** James uploads his resume (DOCX format) through the onboarding wizard.

2. **Parsing Results:**
   - **Education:** Bachelor of Arts in Communications (2018)
   - **Work Experience:**
     - Customer Support Specialist, TechFlow Inc. (2019-2024)
     - Handled 50+ customer inquiries daily, resolved technical issues, documented solutions
     - Created internal knowledge base articles and process documentation
   - **Extracted Skills:**
     - Communication, problem-solving, technical troubleshooting
     - Basic SQL (used for customer data queries)
     - Excel (reporting and data tracking)
     - Customer relationship management (CRM) software
     - Documentation and written communication

3. **Auto-Populated Profile:**
   - All work history and education pre-filled
   - Skill inventory includes: Communication (Advanced), Problem-Solving (Advanced), SQL (Beginner), Excel (Intermediate), Technical Documentation (Advanced)

4. **Skill Mapping & Analysis:**
   - System maps skills to O*NET framework and identifies current occupation: "43-4051.00 - Customer Service Representatives"
   - James indicates interest in "Data Analyst" role (15-2051.00)
   - **Match Analysis:**
     - **Matched Skills:** Problem-solving, Excel, SQL basics, attention to detail
     - **Missing Skills:** Statistical analysis, data visualization (Tableau/Power BI), Python/R programming, advanced SQL, business intelligence concepts
   - **Match Score:** 35% skill alignment with entry-level Data Analyst positions

5. **Automated Recommendations:**
   - **Career Path Suggestions:**
     - **Primary Recommendation:** Junior Data Analyst (15-2051.00)
       - Median Wage: $65,000/year (national average)
       - Projected Growth: 23% (much faster than average)
       - Skills Transferability: High for problem-solving and communication; Medium for technical skills
     - **Alternative Paths:**
       - Business Analyst (focus on customer insights)
       - Technical Support Analyst (stepping stone role)
       - Customer Success Analyst (leverages current experience)
   
   - **Upskilling Recommendations:**
     - **Immediate Priority (0-3 months):**
       - "SQL for Data Analysis" (Coursera/DataCamp) - 6 weeks, $49
       - "Excel Advanced Analytics" (LinkedIn Learning) - 4 weeks, included in subscription
     - **Short-Term (3-6 months):**
       - "Python for Data Science" (edX/Udacity) - 12 weeks, $299
       - "Data Visualization with Tableau" (Tableau eLearning) - 8 weeks, $150
     - **Medium-Term (6-12 months):**
       - "Statistics for Data Analysis" (Khan Academy + university course) - 16 weeks, $500
       - Portfolio project development using real datasets
   
   - **Wage Progression Estimate:**
     - Current Role: $45,000/year
     - After Upskilling (Junior Data Analyst): $55,000-$65,000/year
     - With 2 Years Experience: $70,000-$85,000/year
     - Senior Data Analyst (5+ years): $90,000-$110,000/year
   
   - **Timeline:**
     - Skills acquisition: 9-12 months (part-time learning)
     - Job-ready status: 12-15 months
     - First analyst role placement: 15-18 months

6. **Action Plan:**
   - James reviews the recommendations and selects "Junior Data Analyst" as his target
   - Platform generates personalized 12-month roadmap:
     - Month 1-2: Complete SQL courses and practice queries
     - Month 3-5: Learn Python basics and data manipulation libraries
     - Month 6-8: Master data visualization tools and statistics fundamentals
     - Month 9-10: Build 2-3 portfolio projects demonstrating end-to-end analysis
     - Month 11-12: Update resume, apply to junior analyst positions, prepare for interviews
   - Dashboard tracks course completion, skill acquisition milestones, and application activity
   - James receives weekly reminders and motivational progress updates

**Outcome:**

- James has clear visibility into his career transition requirements
- Automated skill extraction saved 30+ minutes of manual profile entry
- Data-driven recommendations provide realistic timeline and cost expectations
- Personalized learning path maximizes his existing skills while addressing gaps
- Wage projections help James make informed decisions about career investment

### Benefits

- **Time Savings:** Reduces onboarding from 30-45 minutes to 5-10 minutes
- **Accuracy:** NLP parsing minimizes user error and ensures comprehensive skill capture
- **Actionability:** Converts static resume data into dynamic career roadmaps
- **Personalization:** Recommendations tailored to individual background and goals
- **Data-Driven:** Leverages standardized occupational frameworks for credible matching and forecasting

---

## User Personas Walkthrough

### Student Persona

- Seeks practical, affordable career path suited to interests and abilities
- Needs clarity on labor market demand, earning potential, and education requirements
- Relies on platform for trustworthy career data and personalized planning

### Career Changer Persona

- Wants to maximize value of existing skills in a new context
- Needs clear, actionable transition strategy (timeline, costs, steps)
- Seeks career security, growth prospects, and salary improvement

### Career Advisor Persona

- Needs scalable, analytics-powered client management tools
- Relies on evidence-based insights for meaningful guidance
- Provides ongoing support, tracking, and outcome reporting
