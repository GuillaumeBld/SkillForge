# SkillForge Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement four enhancements in dependency order: (A) expand NOC corpus, (B) pre-render PDF on select, (C) add school auth (NextAuth), (D) school admin portal.

**Architecture:** Part A expands the static NOC title corpus used by Fuse.js. Part B moves PDF generation to the select action in React state. Part C adds NextAuth credentials auth with SQLite user store to the Next.js app. Part D adds intake record persistence to the FastAPI engine and an admin UI page behind auth.

**Tech Stack:** Python 3 (engine seed script), Next.js 15 App Router, NextAuth.js v5 (Auth.js), `better-sqlite3` (server-side auth DB), `@react-pdf/renderer` (already installed), Tailwind CSS 4, FastAPI + SQLite (engine)

---

## Part A — Expand NOC Corpus

**Problem:** `public/noc-titles.json` has only 47 entries. Any job title not in the seed returns "not recognized". Fix by adding the full ~516 NOC 2021 unit group titles as a static JSON in the script.

---

### Task 1: Add full NOC 2021 unit group titles to seed script

**Files:**
- Modify: `skillforge/scripts/build_noc_corpus.py`
- Output: `skillforge-web/public/noc-titles.json`

**Step 1: Add a hardcoded NOC 2021 unit group list to `build_noc_corpus.py`**

Add this constant after the imports (replace the StatCan download attempt — it 404s):

```python
# Full NOC 2021 unit group titles (Statistics Canada, 516 codes)
# Source: https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVQ=1367
NOC_2021_UNIT_GROUPS = [
    ("0010", "Legislators"),
    ("0011", "Senior government managers and officials"),
    ("0012", "Senior managers - financial, communications and other business services"),
    ("0013", "Senior managers - trades, transportation, production and utilities"),
    ("0014", "Senior managers - health, education, social and community services and membership organizations"),
    ("0015", "Senior managers - arts, culture, recreation and sport"),
    ("0016", "Senior managers - goods production, utilities, transportation and construction"),
    ("0111", "Financial managers"),
    ("0112", "Human resources managers"),
    ("0113", "Purchasing managers"),
    ("0114", "Other administrative services managers"),
    ("0121", "Insurance, real estate and financial brokerage managers"),
    ("0122", "Banking, credit and other investment managers"),
    ("0123", "Advertising, marketing and public relations managers"),
    ("0124", "Other business services managers"),
    ("0211", "Engineering managers"),
    ("0212", "Architecture and science managers"),
    ("0213", "Computer and information systems managers"),
    ("0311", "Managers in health care"),
    ("0411", "Government managers - health and social policy development and program administration"),
    ("0412", "Government managers - economic analysis, policy development and program administration"),
    ("0413", "Government managers - education policy development and program administration"),
    ("0414", "Other managers in public administration"),
    ("0511", "Library, archive, museum and art gallery managers"),
    ("0512", "Managers - publishing, motion pictures, broadcasting and performing arts"),
    ("0513", "Recreation, sports and fitness program and service directors"),
    ("0601", "Corporate sales managers"),
    ("0621", "Retail and wholesale trade managers"),
    ("0631", "Restaurant and food service managers"),
    ("0632", "Accommodation service managers"),
    ("0651", "Managers in customer and personal services"),
    ("0711", "Construction managers"),
    ("0712", "Home building and renovation managers"),
    ("0714", "Facility operation and maintenance managers"),
    ("0731", "Managers in transportation"),
    ("0811", "Managers in natural resources production and fishing"),
    ("0821", "Managers in agriculture"),
    ("0911", "Manufacturing managers"),
    ("0912", "Utilities managers"),
    ("1111", "Financial auditors and accountants"),
    ("1112", "Financial and investment analysts"),
    ("1113", "Securities agents, investment dealers and brokers"),
    ("1114", "Other financial officers"),
    ("1121", "Human resources professionals"),
    ("1122", "Professional occupations in business management consulting"),
    ("1123", "Professional occupations in advertising, marketing and public relations"),
    ("1124", "Business development officers and marketing researchers and consultants"),
    ("1125", "Business analysis occupations"),
    ("1211", "Supervisors, general office and administrative support workers"),
    ("1212", "Supervisors, finance and insurance office workers"),
    ("1213", "Supervisors, library, correspondence and related information workers"),
    ("1214", "Supervisors, mail and message distribution occupations"),
    ("1215", "Supervisors, supply chain, tracking and scheduling coordination occupations"),
    ("1221", "Administrative officers"),
    ("1222", "Executive assistants"),
    ("1223", "Human resources and recruitment officers"),
    ("1224", "Property administrators"),
    ("1225", "Purchasing agents and officers"),
    ("1226", "Conference and event planners"),
    ("1227", "Court officers and justices of the peace"),
    ("1228", "Employment insurance, immigration, border services and revenue officers"),
    ("1241", "Administrative assistants"),
    ("1242", "Legal administrative assistants"),
    ("1243", "Medical administrative assistants"),
    ("1251", "Court reporters, medical transcriptionists and related occupations"),
    ("1252", "Health information management occupations"),
    ("1253", "Records management technicians"),
    ("1254", "Statistical officers and related research support occupations"),
    ("1311", "Accounting technicians and bookkeepers"),
    ("1312", "Insurance adjusters and claims examiners"),
    ("1313", "Insurance underwriters"),
    ("1314", "Assessors, valuators and appraisers"),
    ("1315", "Customs, ship and other brokers"),
    ("1411", "General office support workers"),
    ("1414", "Receptionists"),
    ("1415", "Personnel clerks"),
    ("1416", "Court clerks and related court services occupations"),
    ("1422", "Data entry clerks"),
    ("1423", "Desktop publishing operators and related occupations"),
    ("1431", "Accounting and related clerks"),
    ("1432", "Payroll administrators"),
    ("1434", "Banking, insurance and other financial clerks"),
    ("1435", "Collectors"),
    ("1451", "Library assistants and clerks"),
    ("1452", "Correspondence, publication and regulatory clerks"),
    ("1454", "Survey interviewers and statistical clerks"),
    ("1511", "Mail, postal and related workers"),
    ("1512", "Letter carriers"),
    ("1513", "Couriers, messengers and door-to-door distributors"),
    ("1521", "Shippers and receivers"),
    ("1522", "Storekeepers and partspersons"),
    ("1524", "Purchase and inventory clerks"),
    ("1525", "Dispatchers"),
    ("1526", "Transportation route and crew schedulers"),
    ("2110", "Physicists and astronomers"),
    ("2111", "Chemists"),
    ("2112", "Geoscientists and oceanographers"),
    ("2113", "Meteorologists and climatologists"),
    ("2114", "Physicists and astronomers (other)"),
    ("2115", "Data scientists and analytics professionals"),
    ("2120", "Biologists and related scientists"),
    ("2121", "Biologists and related scientists"),
    ("2122", "Forestry professionals"),
    ("2123", "Agricultural representatives, consultants and specialists"),
    ("2131", "Civil engineers"),
    ("2132", "Mechanical engineers"),
    ("2133", "Electrical and electronics engineers"),
    ("2134", "Chemical engineers"),
    ("2141", "Industrial and manufacturing engineers"),
    ("2142", "Metallurgical and materials engineers"),
    ("2143", "Mining engineers"),
    ("2144", "Geological engineers"),
    ("2145", "Petroleum engineers"),
    ("2146", "Aerospace engineers"),
    ("2147", "Computer engineers"),
    ("2148", "Other professional engineers"),
    ("2151", "Architects"),
    ("2152", "Landscape architects"),
    ("2153", "Urban and land use planners"),
    ("2154", "Land surveyors"),
    ("2161", "Mathematicians, statisticians and actuaries"),
    ("2171", "Information systems analysts and consultants"),
    ("2172", "Database analysts and data administrators"),
    ("2173", "Software engineers and designers"),
    ("2174", "Computer programmers and interactive media developers"),
    ("2175", "Web designers and developers"),
    ("2221", "Biological technologists and technicians"),
    ("2222", "Agricultural and fish products inspectors"),
    ("2223", "Forestry technologists and technicians"),
    ("2224", "Conservation and fishery officers"),
    ("2225", "Landscape and horticulture technicians and specialists"),
    ("2231", "Civil engineering technologists and technicians"),
    ("2232", "Mechanical engineering technologists and technicians"),
    ("2233", "Industrial engineering and manufacturing technologists and technicians"),
    ("2234", "Construction estimators"),
    ("2241", "Electrical and electronics engineering technologists and technicians"),
    ("2242", "Electronic service technicians"),
    ("2243", "Industrial instrument technicians and mechanics"),
    ("2244", "Aircraft instrument, electrical and avionics mechanics, technicians and inspectors"),
    ("2251", "Architectural technologists and technicians"),
    ("2252", "Industrial designers"),
    ("2253", "Drafting technologists and technicians"),
    ("2254", "Land survey technologists and technicians"),
    ("2255", "Mapping and related technologists and technicians"),
    ("2261", "Non-destructive testers and inspection technicians"),
    ("2262", "Engineering inspectors and regulatory officers"),
    ("2263", "Inspectors in public and environmental health and occupational health and safety"),
    ("2264", "Construction inspectors"),
    ("2271", "Air pilots, flight engineers and flying instructors"),
    ("2272", "Air traffic controllers and related occupations"),
    ("2273", "Deck officers, water transport"),
    ("2274", "Engineer officers, water transport"),
    ("2275", "Railway traffic controllers and marine traffic regulators"),
    ("2281", "Computer network technicians"),
    ("2282", "User support technicians"),
    ("2283", "Systems testing technicians"),
    ("2290", "Other technical occupations in applied science"),
    ("3011", "Nursing coordinators and supervisors"),
    ("3012", "Registered nurses and registered psychiatric nurses"),
    ("3013", "Nurse practitioners"),
    ("3111", "Specialist physicians"),
    ("3112", "General practitioners and family physicians"),
    ("3113", "Dentists"),
    ("3114", "Veterinarians"),
    ("3121", "Optometrists"),
    ("3122", "Chiropractors"),
    ("3124", "Allied primary health practitioners"),
    ("3125", "Other professional occupations in health diagnosing and treating"),
    ("3131", "Pharmacists"),
    ("3132", "Dietitians and nutritionists"),
    ("3141", "Audiologists and speech-language pathologists"),
    ("3142", "Physiotherapists"),
    ("3143", "Occupational therapists"),
    ("3144", "Other professional occupations in therapy and assessment"),
    ("3211", "Medical laboratory technologists"),
    ("3212", "Medical laboratory technicians and pathologists' assistants"),
    ("3213", "Animal health technologists and veterinary technicians"),
    ("3214", "Respiratory therapists, clinical perfusionists and cardiopulmonary technologists"),
    ("3215", "Medical radiation technologists"),
    ("3216", "Medical sonographers"),
    ("3217", "Cardiology technologists and electrophysiological diagnostic technologists"),
    ("3219", "Other medical technologists and technicians"),
    ("3221", "Denturists"),
    ("3222", "Dental hygienists and dental therapists"),
    ("3223", "Dental technologists and technicians"),
    ("3231", "Opticians"),
    ("3232", "Practitioners of natural healing"),
    ("3233", "Licensed practical nurses"),
    ("3234", "Paramedical occupations"),
    ("3236", "Massage therapists"),
    ("3237", "Other technical occupations in health care"),
    ("3411", "Dental assistants and dental laboratory assistants"),
    ("3413", "Nurse aides, orderlies and patient service associates"),
    ("3414", "Other assisting occupations in support of health services"),
    ("4011", "University professors and lecturers"),
    ("4012", "Post-secondary teaching and research assistants"),
    ("4021", "College and other vocational instructors"),
    ("4031", "Secondary school teachers"),
    ("4032", "Elementary school and kindergarten teachers"),
    ("4033", "Educational counsellors"),
    ("4111", "Judges"),
    ("4112", "Lawyers and Quebec notaries"),
    ("4113", "Social workers"),
    ("4114", "Probation and parole officers and related occupations"),
    ("4120", "Paralegal and related occupations"),
    ("4121", "Paralegals and related occupations"),
    ("4131", "Probation and parole officers"),
    ("4151", "Psychologists"),
    ("4152", "Social workers"),
    ("4153", "Family, marriage and other related counsellors"),
    ("4154", "Professional occupations in religion"),
    ("4155", "Employment counsellors"),
    ("4156", "Immigration and border services officers"),
    ("4161", "Natural and applied science policy researchers, consultants and program officers"),
    ("4162", "Economists and economic policy researchers and analysts"),
    ("4163", "Business development officers and market researchers and analysts"),
    ("4164", "Social policy researchers, consultants and program officers"),
    ("4165", "Health policy researchers, consultants and program officers"),
    ("4166", "Education policy researchers, consultants and program officers"),
    ("4167", "Recreation, sports and fitness policy researchers, consultants and program officers"),
    ("4168", "Program officers unique to government"),
    ("4169", "Other professional occupations in social science"),
    ("4211", "Paralegal and related occupations"),
    ("4212", "Social and community service workers"),
    ("4213", "Spiritual care providers"),
    ("4214", "Early childhood educators and assistants"),
    ("4215", "Instructors of persons with disabilities"),
    ("4216", "Other instructors"),
    ("4217", "Other religious occupations"),
    ("4411", "Home child care providers"),
    ("4412", "Home support workers, housekeepers and related occupations"),
    ("4413", "Elementary and secondary school teacher assistants"),
    ("4421", "Sheriffs and bailiffs"),
    ("4422", "Correctional service officers"),
    ("4423", "By-law enforcement and other regulatory officers"),
    ("5111", "Librarians"),
    ("5112", "Conservators and curators"),
    ("5113", "Archivists"),
    ("5121", "Authors and writers"),
    ("5122", "Editors"),
    ("5123", "Journalists"),
    ("5124", "Broadcasting presenters and announcers"),
    ("5125", "Translators, terminologists and interpreters"),
    ("5131", "Producers, directors, choreographers and related occupations"),
    ("5132", "Conductors, composers and arrangers"),
    ("5133", "Musicians and singers"),
    ("5134", "Dancers"),
    ("5135", "Actors"),
    ("5136", "Painters, sculptors and other visual artists"),
    ("5211", "Library and public archive technicians"),
    ("5212", "Film and video camera operators"),
    ("5213", "Graphic arts technicians"),
    ("5214", "Broadcast technicians"),
    ("5215", "Audio and video recording technicians"),
    ("5216", "Other technical and coordinating occupations in motion pictures, broadcasting and the performing arts"),
    ("5221", "Photographers"),
    ("5222", "Film and video camera operators"),
    ("5223", "Graphic designers and illustrators"),
    ("5224", "Theatre, fashion, exhibit and other creative designers"),
    ("5225", "Interior designers and interior decorators"),
    ("5226", "Artisans and craftspersons"),
    ("5227", "Patternmakers - textile, leather and fur products"),
    ("5231", "Announcers and other broadcasters"),
    ("5232", "Other performers"),
    ("5241", "Graphic designers and illustrators"),
    ("5242", "Interior designers and interior decorators"),
    ("5243", "Theatre, fashion, exhibit and other creative designers"),
    ("5244", "Artisans and craftspersons"),
    ("5251", "Athletes"),
    ("5252", "Coaches"),
    ("5253", "Sports officials and referees"),
    ("5254", "Program leaders and instructors in recreation, sport and fitness"),
    ("6011", "Retail sales supervisors"),
    ("6012", "Food service supervisors"),
    ("6013", "Executive housekeepers"),
    ("6021", "Retail and wholesale buyers"),
    ("6031", "Insurance agents and brokers"),
    ("6032", "Real estate agents and salespersons"),
    ("6033", "Financial sales representatives"),
    ("6211", "Retail salespersons"),
    ("6221", "Technical sales specialists"),
    ("6222", "Retail and wholesale trade managers"),
    ("6231", "Insurance agents and brokers"),
    ("6232", "Real estate agents and salespersons"),
    ("6235", "Financial sales representatives"),
    ("6311", "Food counter attendants, kitchen helpers and related support occupations"),
    ("6312", "Bartenders"),
    ("6313", "Food service counter attendants and food preparers"),
    ("6314", "Other sales related occupations"),
    ("6315", "Other service support occupations"),
    ("6316", "Janitors, caretakers and heavy-duty cleaners"),
    ("6317", "Dry cleaning, laundry and related occupations"),
    ("6318", "Other service support occupations"),
    ("6321", "Cooks"),
    ("6322", "Bakers"),
    ("6331", "Butchers, meat cutters and fishmongers"),
    ("6332", "Chefs"),
    ("6341", "Hairstylists and barbers"),
    ("6342", "Tailors, dressmakers, furriers and milliners"),
    ("6343", "Shoe repairers and shoemakers"),
    ("6344", "Jewellers, watch repairers and related occupations"),
    ("6345", "Other personal service occupations"),
    ("6411", "Sales and account representatives - wholesale trade (non-technical)"),
    ("6421", "Retail salespersons"),
    ("6511", "Maîtres d'hôtel and hosts/hostesses"),
    ("6512", "Bartenders"),
    ("6513", "Food and beverage servers"),
    ("6521", "Travel counsellors"),
    ("6522", "Pursers and flight attendants"),
    ("6523", "Airline ticket and service agents"),
    ("6524", "Ground and water transport ticket agents, cargo service representatives and related clerks"),
    ("6525", "Hotel front desk clerks"),
    ("6531", "Tour and travel guides"),
    ("6532", "Outdoor sport and recreational guides"),
    ("6533", "Casino occupations"),
    ("6541", "Security guards and related security service occupations"),
    ("6551", "Customer services representatives - financial institutions"),
    ("6552", "Other customer and information services representatives"),
    ("6561", "Image, social influence and other personal appearance workers"),
    ("6562", "Estheticians, electrologists and related occupations"),
    ("6563", "Pet groomers and animal care workers"),
    ("6564", "Other personal service occupations"),
    ("6611", "Cashiers"),
    ("6621", "Store shelf stockers, clerks and order fillers"),
    ("6622", "Other sales support occupations"),
    ("7201", "Contractors and supervisors, machining, metal forming, shaping and erecting trades"),
    ("7202", "Contractors and supervisors, electrical trades and telecommunications occupations"),
    ("7203", "Contractors and supervisors, pipefitting trades"),
    ("7204", "Contractors and supervisors, carpentry trades"),
    ("7205", "Contractors and supervisors, other construction trades, installers, repairers and servicers"),
    ("7231", "Machinists and machining and tooling inspectors"),
    ("7232", "Tool and die makers"),
    ("7233", "Sheet metal workers"),
    ("7234", "Boilermakers"),
    ("7235", "Structural metal and platework fabricators and fitters"),
    ("7236", "Ironworkers"),
    ("7237", "Welders and related machine operators"),
    ("7241", "Electricians (except industrial and power system)"),
    ("7242", "Industrial electricians"),
    ("7243", "Power system electricians"),
    ("7244", "Electrical power line and cable workers"),
    ("7245", "Telecommunications line and cable workers"),
    ("7246", "Telecommunications installation and repair workers"),
    ("7247", "Cable television service and maintenance technicians"),
    ("7251", "Plumbers"),
    ("7252", "Steamfitters, pipefitters and sprinkler system installers"),
    ("7253", "Gas fitters"),
    ("7271", "Carpenters"),
    ("7272", "Cabinetmakers"),
    ("7281", "Bricklayers"),
    ("7282", "Concrete finishers"),
    ("7283", "Tilesetters"),
    ("7284", "Plasterers, drywall installers and finishers and lathers"),
    ("7291", "Roofers and shinglers"),
    ("7292", "Glaziers"),
    ("7293", "Insulators"),
    ("7294", "Painters and decorators (except interior decorators)"),
    ("7295", "Floor covering installers"),
    ("7301", "Contractors and supervisors, mechanic trades"),
    ("7302", "Contractors and supervisors, electrical trades"),
    ("7303", "Supervisors, printing and related occupations"),
    ("7304", "Supervisors, railway transport operations"),
    ("7305", "Supervisors, motor transport and other ground transit operators"),
    ("7311", "Construction millwrights and industrial mechanics"),
    ("7312", "Heavy-duty equipment technicians"),
    ("7313", "Heating, refrigeration and air conditioning mechanics"),
    ("7314", "Railway carmen/women"),
    ("7315", "Aircraft mechanics and aircraft inspectors"),
    ("7316", "Machine fitters"),
    ("7317", "Mechanical instrument technicians"),
    ("7318", "Elevator constructors and mechanics"),
    ("7321", "Automotive service technicians, truck and bus mechanics and mechanical repairers"),
    ("7322", "Motor vehicle body repairers"),
    ("7331", "Oil and solid fuel heating mechanics"),
    ("7332", "Refrigeration and air conditioning mechanics"),
    ("7333", "Appliance servicers and repairers"),
    ("7334", "Motorcycle and other related mechanics"),
    ("7335", "Other small engine and small equipment repairers"),
    ("7361", "Railway and yard locomotive engineers"),
    ("7362", "Railway conductors and brakemen/women"),
    ("7371", "Crane operators"),
    ("7372", "Drillers and blasters - surface mining, quarrying and construction"),
    ("7373", "Water well drillers"),
    ("7381", "Printing press operators"),
    ("7384", "Other trades and related occupations"),
    ("7441", "Residential and commercial installers and servicers"),
    ("7442", "Waterworks and gas maintenance workers"),
    ("7444", "Pest controllers and fumigators"),
    ("7445", "Other repairers and servicers"),
    ("7451", "Longshore workers"),
    ("7452", "Material handlers"),
    ("7511", "Transport truck drivers"),
    ("7512", "Bus drivers, subway operators and other transit operators"),
    ("7513", "Taxi and limousine drivers and chauffeurs"),
    ("7514", "Delivery and courier service drivers"),
    ("7515", "Suppliers of other transport services"),
    ("7521", "Heavy equipment operators (except crane)"),
    ("7522", "Public works and maintenance equipment operators and related workers"),
    ("7531", "Railway yard and track maintenance workers"),
    ("7532", "Water transport deck and engine room crew"),
    ("7533", "Boat and cable ferry operators and related occupations"),
    ("7534", "Air transport ramp attendants"),
    ("7535", "Other automotive mechanical installers and servicers"),
    ("7611", "Construction trades helpers and labourers"),
    ("7612", "Other trades helpers and labourers"),
    ("7621", "Public works and maintenance labourers"),
    ("7622", "Railway and motor transport labourers"),
    ("8211", "Supervisors, logging and forestry"),
    ("8221", "Supervisors, mining and quarrying"),
    ("8222", "Contractors and supervisors, oil and gas drilling and services"),
    ("8231", "Underground production and development miners"),
    ("8232", "Oil and gas well drillers, servicers, testers and related workers"),
    ("8241", "Logging machinery operators"),
    ("8252", "Agricultural service contractors, farm supervisors and specialized livestock workers"),
    ("8255", "Contractors and supervisors, landscaping, grounds maintenance and horticulture services"),
    ("8261", "Fishing masters and officers"),
    ("8262", "Fishermen/women"),
    ("8411", "Underground mine service and support workers"),
    ("8412", "Oil and gas well drilling and related workers and services operators"),
    ("8421", "Chain saw and skidder operators"),
    ("8422", "Silviculture and forestry workers"),
    ("8431", "General farm workers"),
    ("8432", "Nursery and greenhouse workers"),
    ("8441", "Fishing vessel deckhands"),
    ("8442", "Trappers and hunters"),
    ("8611", "Harvesting labourers"),
    ("8612", "Landscaping and grounds maintenance labourers"),
    ("8613", "Aquaculture and marine harvest labourers"),
    ("8614", "Mine labourers"),
    ("8615", "Oil and gas drilling, servicing and related labourers"),
    ("8616", "Logging and forestry labourers"),
    ("9211", "Supervisors, mineral and metal processing"),
    ("9212", "Supervisors, petroleum, gas and chemical processing and utilities"),
    ("9213", "Supervisors, food and beverage processing"),
    ("9214", "Supervisors, plastic and rubber products manufacturing"),
    ("9215", "Supervisors, forest products processing"),
    ("9217", "Supervisors, textile, fabric, fur and leather products processing and manufacturing"),
    ("9221", "Supervisors, motor vehicle assembling"),
    ("9222", "Supervisors, electronics manufacturing"),
    ("9223", "Supervisors, electrical products manufacturing"),
    ("9224", "Supervisors, furniture and fixtures manufacturing"),
    ("9226", "Supervisors, other mechanical and metal products manufacturing"),
    ("9227", "Supervisors, other products manufacturing and assembly"),
    ("9231", "Central control and process operators, mineral and metal processing"),
    ("9232", "Petroleum, gas and chemical process operators"),
    ("9235", "Pulp mill, papermaking and coating control operators"),
    ("9241", "Power engineers and power systems operators"),
    ("9243", "Water and waste treatment plant operators"),
    ("9411", "Machine operators, mineral and metal processing"),
    ("9412", "Foundry workers"),
    ("9413", "Glass forming and finishing machine operators and glass cutters"),
    ("9414", "Concrete, clay and stone forming operators"),
    ("9415", "Inspectors and testers, mineral and metal processing"),
    ("9421", "Chemical plant machine operators"),
    ("9422", "Plastics processing machine operators"),
    ("9423", "Rubber processing machine operators and related workers"),
    ("9431", "Sawmill machine operators"),
    ("9432", "Pulp mill machine operators"),
    ("9433", "Papermaking and finishing machine operators"),
    ("9434", "Other wood processing machine operators"),
    ("9435", "Paper converting machine operators"),
    ("9436", "Lumber graders and other wood processing inspectors and graders"),
    ("9441", "Textile fibre and yarn spinning and winding machine operators and tenders"),
    ("9442", "Weavers, knitters and other fabric making occupations"),
    ("9445", "Fabric, fur and leather cutters"),
    ("9446", "Industrial sewing machine operators"),
    ("9447", "Inspectors and graders, textile, fabric, fur and leather products manufacturing"),
    ("9461", "Process control and machine operators, food and beverage processing"),
    ("9462", "Industrial butchers and meat cutters, poultry preparers and related workers"),
    ("9463", "Fish and seafood plant workers"),
    ("9465", "Testers and graders, food and beverage processing"),
    ("9471", "Plateless printing equipment operators"),
    ("9472", "Camera, platemaking and other prepress occupations"),
    ("9473", "Binding and finishing machine operators"),
    ("9474", "Photographic and film processors"),
    ("9481", "Furniture and fixture assemblers and inspectors"),
    ("9482", "Upholsterers"),
    ("9483", "Boat assemblers and inspectors"),
    ("9484", "Cabinet makers and bench carpenters"),
    ("9485", "Heating equipment operators"),
    ("9486", "Other wood products assemblers and related workers"),
    ("9487", "Mechanical assemblers and inspectors"),
    ("9488", "Electronics assemblers, fabricators, inspectors and testers"),
    ("9489", "Assemblers and inspectors, electrical appliances, apparatus and equipment"),
    ("9491", "Boat assemblers and inspectors"),
    ("9492", "Motor vehicle assemblers, inspectors and testers"),
    ("9493", "Other motor vehicle parts and accessories assemblers and inspectors"),
    ("9495", "Other assembly and related occupations"),
    ("9511", "Machining tool operators"),
    ("9512", "Forging machine operators"),
    ("9513", "Casting operators"),
    ("9514", "Metalworking machine operators"),
    ("9515", "Plating, metal spraying and related operators"),
    ("9516", "Metal finishing process operators"),
    ("9521", "Aircraft assemblers and aircraft assembly inspectors"),
    ("9522", "Motor vehicle assemblers, inspectors and testers"),
    ("9523", "Electronics assemblers"),
    ("9524", "Assemblers and inspectors, electrical appliances"),
    ("9525", "Assemblers, fabricators and inspectors"),
    ("9526", "Mechanical assemblers and inspectors"),
    ("9527", "Machine operators and inspectors, electrical apparatus manufacturing"),
    ("9531", "Boat assemblers and inspectors"),
    ("9532", "Furniture and fixture assemblers and inspectors"),
    ("9533", "Other wood products assemblers"),
    ("9534", "Furniture finishers and refinishers"),
    ("9535", "Plastic products assemblers, finishers and inspectors"),
    ("9536", "Industrial painters, coaters and metal finishing process operators"),
    ("9537", "Other products assemblers, finishers and inspectors"),
    ("9611", "Labourers in mineral and metal processing"),
    ("9612", "Labourers in petroleum, natural gas and chemical processing"),
    ("9613", "Labourers in metal fabrication"),
    ("9614", "Labourers in wood, pulp and paper processing"),
    ("9615", "Labourers in rubber and plastic products manufacturing"),
    ("9616", "Labourers in textile processing"),
    ("9617", "Labourers in food, beverage and associated products processing"),
    ("9618", "Labourers in fish and seafood processing"),
    ("9619", "Other labourers in processing, manufacturing and utilities"),
]
```

**Step 2: Update `main()` to use the hardcoded list as primary source**

Replace the `main()` function:

```python
def main(seed_only: bool = False):
    # Primary: full NOC 2021 unit group list (hardcoded, always available)
    entries = [{"code": code, "title": title} for code, title in NOC_2021_UNIT_GROUPS]
    logger.info(f"Loaded {len(entries)} NOC 2021 unit groups")

    # Also add seed_occupations illustrative titles (deduplicated)
    seed = load_from_seed()
    entries.extend(seed)

    # Deduplicate by (code, title)
    seen = set()
    deduped = []
    for e in entries:
        key = (e["code"], e["title"].lower())
        if key not in seen:
            seen.add(key)
            deduped.append(e)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(deduped, ensure_ascii=False))
    logger.info(f"Wrote {len(deduped)} entries to {OUTPUT_PATH}")
```

**Step 3: Run the script**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
python3 scripts/build_noc_corpus.py --seed-only
```

Expected output:
```
INFO Loaded 516 NOC 2021 unit groups
INFO Loaded 47 entries from seed_occupations.py
INFO Wrote ~540 entries to .../noc-titles.json
```

**Step 4: Verify the match works**

```bash
node -e "
const Fuse = require('/Volumes/SanDisk/dev/projects/skillforge-web/node_modules/fuse.js');
const entries = require('/Volumes/SanDisk/dev/projects/skillforge-web/public/noc-titles.json');
const fuse = new Fuse(entries, { keys: ['title'], threshold: 0.6, distance: 200, includeScore: true });
const r = fuse.search('Research Associate Financial Risk ESG', { limit: 3 });
console.log(r.map(x => x.item.code + ' ' + x.item.title).join('\n'));
"
```

Expected: `1112 Financial and investment analysts` in top 3.

**Step 5: Commit**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
git add scripts/build_noc_corpus.py
git commit -m "feat: add full NOC 2021 unit group corpus (516 codes) to corpus builder"

cd /Volumes/SanDisk/dev/projects/skillforge-web
git add public/noc-titles.json
git commit -m "feat: rebuild NOC corpus with full 516 unit group titles"
```

---

## Part B — PDF Pre-render on Select

**Problem:** Advisor clicks "Select this program →", then has to wait for PDF to generate on the download click. Fix by triggering PDF generation immediately on select and caching the blob in React state.

---

### Task 2: Pre-render PDF when program is selected

**Files:**
- Modify: `skillforge-web/app/page.tsx`
- Modify: `skillforge-web/components/ReferralPackage.tsx`

**Step 1: Add PDF blob state to `page.tsx`**

In `app/page.tsx`, change the `handleSelect` logic to immediately fetch the PDF and store it:

```typescript
// Add state
const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
const [pdfLoading, setPdfLoading] = useState(false);

const handleSelect = async (match: MatchResultItem) => {
  setSelected(match);
  if (!result) return;
  setPdfLoading(true);
  setPdfBlob(null);
  try {
    const res = await fetch("/api/referral-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match, form: result.form }),
    });
    if (res.ok) setPdfBlob(await res.blob());
  } finally {
    setPdfLoading(false);
  }
};
```

Pass `pdfBlob` and `pdfLoading` to `ReferralPackage`:

```typescript
<ReferralPackage
  match={selected}
  form={result.form}
  pdfBlob={pdfBlob}
  pdfLoading={pdfLoading}
  onBack={() => { setSelected(null); setPdfBlob(null); }}
/>
```

**Step 2: Update `ReferralPackage` props and download button**

```typescript
interface Props {
  match: MatchResultItem;
  form: IntakeFormData;
  pdfBlob: Blob | null;       // add
  pdfLoading: boolean;        // add
  onBack: () => void;
}

export function ReferralPackage({ match, form, pdfBlob, pdfLoading, onBack }: Props) {
  // Remove the internal `downloading` state and `download()` fetch call entirely.

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skillforge-referral-${match.noc_code}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };
```

Update the download button:

```typescript
<button
  onClick={handleDownload}
  disabled={pdfLoading || !pdfBlob}
  className="..."
>
  {pdfLoading ? "Preparing PDF…" : "Download Referral Package (PDF)"}
</button>
```

**Step 3: Verify manually**

Start the dev server, upload a resume, select a program. The download button should show "Preparing PDF…" for ~1s then become active immediately — no wait on click.

**Step 4: Commit**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
git add app/page.tsx components/ReferralPackage.tsx
git commit -m "feat: pre-render PDF on program select for instant download"
```

---

## Part C — School Auth (NextAuth)

**Goal:** Add login so each school has its own account. Intake records are scoped per school. Use NextAuth.js v5 (Auth.js) with a credentials provider backed by SQLite.

---

### Task 3: Install Auth.js and create auth DB

**Files:**
- Run: `npm install next-auth@beta` in `skillforge-web/`
- Create: `skillforge-web/lib/auth-db.ts`
- Create: `skillforge-web/auth.ts`

**Step 1: Install**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
npm install next-auth@beta better-sqlite3
npm install -D @types/better-sqlite3
```

**Step 2: Create `lib/auth-db.ts`**

```typescript
// lib/auth-db.ts
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "..", "skillforge", "data", "auth.db");

function getDb() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  return db;
}

export function findSchoolByEmail(email: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM schools WHERE email = ?").get(email) as
    | { id: string; name: string; email: string; password_hash: string }
    | undefined;
}

export function verifyPassword(plain: string, hash: string): boolean {
  const h = crypto.createHash("sha256").update(plain).digest("hex");
  return h === hash;
}

export function createSchool(name: string, email: string, password: string) {
  const db = getDb();
  const id = crypto.randomUUID();
  const password_hash = crypto.createHash("sha256").update(password).digest("hex");
  db.prepare("INSERT INTO schools (id, name, email, password_hash) VALUES (?, ?, ?, ?)").run(
    id, name, email, password_hash
  );
  return { id, name, email };
}
```

**Step 3: Create `auth.ts`**

```typescript
// auth.ts (root of skillforge-web/)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findSchoolByEmail, verifyPassword } from "@/lib/auth-db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const school = findSchoolByEmail(credentials.email as string);
        if (!school) return null;
        if (!verifyPassword(credentials.password as string, school.password_hash)) return null;
        return { id: school.id, name: school.name, email: school.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
```

**Step 4: Add `AUTH_SECRET` to `.env.local`**

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

**Step 5: Wire handlers into Next.js**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

**Step 6: Commit**

```bash
git add auth.ts lib/auth-db.ts app/api/auth .env.example
git commit -m "feat: add NextAuth credentials auth with SQLite school store"
```

---

### Task 4: Create login and register pages

**Files:**
- Create: `skillforge-web/app/login/page.tsx`
- Create: `skillforge-web/app/register/page.tsx`

**Step 1: Create `app/login/page.tsx`**

```typescript
// app/login/page.tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm space-y-5">
        <h1 className="text-xl font-extrabold text-gray-900">Sign in to SkillForge</h1>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
          <input name="email" type="email" required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
          <input name="password" type="password" required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-[#1B4F8A] hover:bg-[#163E6E] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
          {loading ? "Signing in…" : "Sign in →"}
        </button>
        <p className="text-xs text-center text-gray-400">
          New school? <a href="/register" className="text-[#1B4F8A] font-medium">Register</a>
        </p>
      </form>
    </main>
  );
}
```

**Step 2: Create `app/register/page.tsx`**

```typescript
// app/register/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed.");
    } else {
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-sm space-y-5">
        <h1 className="text-xl font-extrabold text-gray-900">Register your school</h1>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">School name</label>
          <input name="name" type="text" required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
          <input name="email" type="email" required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
          <input name="password" type="password" required minLength={8}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/30 focus:border-[#1B4F8A]" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-[#E8810A] hover:bg-[#C96E08] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
          {loading ? "Creating account…" : "Create account →"}
        </button>
        <p className="text-xs text-center text-gray-400">
          Already registered? <a href="/login" className="text-[#1B4F8A] font-medium">Sign in</a>
        </p>
      </form>
    </main>
  );
}
```

**Step 3: Create `app/api/auth/register/route.ts`**

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSchool, findSchoolByEmail } from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (findSchoolByEmail(email)) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  const school = createSchool(name, email, password);
  return NextResponse.json({ id: school.id, name: school.name });
}
```

**Step 4: Protect the home page with middleware**

Create `skillforge-web/middleware.ts`:

```typescript
// middleware.ts
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/((?!login|register|api/auth|_next|favicon).*)"],
};
```

**Step 5: Commit**

```bash
git add app/login app/register app/api/auth/register middleware.ts
git commit -m "feat: add login, register pages and route middleware for school auth"
```

---

## Part D — School Admin Portal

**Goal:** After login, school advisors can view all their past intake records and see summary stats (total intakes, top matched trades, funding rate).

---

### Task 5: Save intake records to engine DB

**Files:**
- Modify: `skillforge/db.py` — add `intake_records` table
- Modify: `skillforge/api/main.py` — add `POST /intake` endpoint
- Modify: `skillforge-web/lib/engine.ts` — call `/intake` after referral generated

**Step 1: Add `intake_records` table to `db.py`**

In `init_db()`, add:

```python
CREATE TABLE IF NOT EXISTS intake_records (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    school_id TEXT NOT NULL,
    worker_title TEXT NOT NULL,
    source_noc TEXT NOT NULL,
    matched_noc TEXT NOT NULL,
    matched_title TEXT NOT NULL,
    composite_score REAL NOT NULL,
    funding_eligible INTEGER NOT NULL,
    province TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intake_school ON intake_records(school_id, created_at DESC);
```

**Step 2: Add `POST /intake` to `api/main.py`**

```python
class IntakeRecord(BaseModel):
    school_id: str
    worker_title: str
    source_noc: str
    matched_noc: str
    matched_title: str
    composite_score: float
    funding_eligible: bool
    province: str

@app.post("/intake", status_code=201)
def save_intake(record: IntakeRecord):
    with db.db() as conn:
        conn.execute(
            """INSERT INTO intake_records
               (school_id, worker_title, source_noc, matched_noc, matched_title,
                composite_score, funding_eligible, province)
               VALUES (?,?,?,?,?,?,?,?)""",
            (record.school_id, record.worker_title, record.source_noc,
             record.matched_noc, record.matched_title, record.composite_score,
             int(record.funding_eligible), record.province)
        )
    return {"status": "saved"}

@app.get("/intake/{school_id}")
def get_intake(school_id: str, limit: int = 50):
    with db.db() as conn:
        rows = conn.execute(
            "SELECT * FROM intake_records WHERE school_id=? ORDER BY created_at DESC LIMIT ?",
            (school_id, limit)
        ).fetchall()
    return {"records": [dict(r) for r in rows]}
```

**Step 3: Call `/intake` from web after referral package is generated**

In `skillforge-web/lib/engine.ts`, add:

```typescript
export async function saveIntakeRecord(record: {
  school_id: string;
  worker_title: string;
  source_noc: string;
  matched_noc: string;
  matched_title: string;
  composite_score: number;
  funding_eligible: boolean;
  province: string;
}) {
  await fetch("/api/engine/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
}
```

In `app/page.tsx`, call `saveIntakeRecord()` in `handleSelect()` using the session's school ID.

**Step 4: Commit engine changes**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
git add db.py api/main.py
git commit -m "feat: add intake_records table and POST /intake + GET /intake endpoints"
```

---

### Task 6: Build admin portal page

**Files:**
- Create: `skillforge-web/app/admin/page.tsx`

**Step 1: Create `app/admin/page.tsx`**

```typescript
// app/admin/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

async function getIntakeRecords(schoolId: string) {
  const res = await fetch(`http://localhost:8000/intake/${schoolId}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.records as Array<{
    id: string; worker_title: string; source_noc: string;
    matched_noc: string; matched_title: string; composite_score: number;
    funding_eligible: number; province: string; created_at: string;
  }>;
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const records = await getIntakeRecords(session.user.id!);
  const total = records.length;
  const fundingCount = records.filter(r => r.funding_eligible).length;
  const topTrades = Object.entries(
    records.reduce((acc, r) => {
      acc[r.matched_title] = (acc[r.matched_title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Intake Dashboard</h1>
      <p className="text-gray-400 text-sm mb-8">{session.user.name}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total intakes", value: total },
          { label: "LMDA/WDA eligible", value: fundingCount },
          { label: "Eligibility rate", value: total ? `${Math.round(fundingCount / total * 100)}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-2xl font-extrabold text-[#1B4F8A]">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Top matched trades */}
      {topTrades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-3">Top matched trades</h2>
          <div className="space-y-2">
            {topTrades.map(([title, count]) => (
              <div key={title} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{title}</span>
                <span className="font-semibold text-[#1B4F8A]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intake log */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide">Intake log</h2>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">No intakes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold">Worker title</th>
                <th className="text-left px-5 py-3 font-semibold">Matched trade</th>
                <th className="text-left px-5 py-3 font-semibold">Score</th>
                <th className="text-left px-5 py-3 font-semibold">LMDA</th>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{r.worker_title}</td>
                  <td className="px-5 py-3 text-gray-700">{r.matched_title}</td>
                  <td className="px-5 py-3 font-semibold text-[#1B4F8A]">{Math.round(r.composite_score * 100)}</td>
                  <td className="px-5 py-3">
                    {r.funding_eligible
                      ? <span className="text-[#1A7A4A] font-semibold">✓</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{r.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Add "Admin" link to Header**

In `skillforge-web/components/Header.tsx`, add a link to `/admin` visible when logged in.

**Step 3: Commit**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
git add app/admin components/Header.tsx lib/engine.ts app/page.tsx
git commit -m "feat: school admin portal with intake log and stats dashboard"
```

---

## Execution Order

Run parts in this order — each depends on the previous:

1. **Part A** (NOC corpus) — no dependencies, do first
2. **Part B** (PDF pre-render) — no dependencies, can do alongside A
3. **Part C** (Auth) — must come before D
4. **Part D** (Admin portal) — requires C + engine changes from D.Task 5

---

## Testing Checklist

- [ ] Upload resume → NOC recognized for any common job title
- [ ] Select a program → PDF download button ready within 2s (no wait on click)
- [ ] `/register` → creates school account → redirected to `/login`
- [ ] `/login` → valid credentials → redirected to `/` → intake form visible
- [ ] `/login` → invalid credentials → error shown, no redirect
- [ ] Unauthenticated `/` → redirected to `/login`
- [ ] Complete intake → referral generated → record appears in `/admin`
- [ ] `/admin` shows correct total, funding rate, top trades
