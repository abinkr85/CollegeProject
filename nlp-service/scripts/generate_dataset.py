import os
import csv
import random

# Seed for reproducibility
random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw")
os.makedirs(DATA_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(DATA_DIR, "complaints.csv")

# Rich domain complaints for campus facilities across all 7 categories
COMPLAINTS_DATA = [
    # ------------------ ELECTRICAL ------------------
    # High Priority (Danger / Outage / Urgent)
    ("Smoke coming from switchboard in 2nd floor computer lab, burning smell detected", "Electrical", "HIGH"),
    ("Sparks flying from electrical socket near classroom 204, dangerous for students", "Electrical", "HIGH"),
    ("Short circuit in hostel block B meter room with loud sound and burning smell", "Electrical", "HIGH"),
    ("Exposed live wire hanging near water cooler on ground floor, severe shock hazard", "Electrical", "HIGH"),
    ("Electric shock felt when touching the metal door frame in physiotherapy electrotherapy lab", "Electrical", "HIGH"),
    ("Complete power blackout in entire nursing hostel during night study hours", "Electrical", "HIGH"),
    ("Main circuit breaker keeps tripping repeatedly causing complete power cut in exam hall", "Electrical", "HIGH"),
    ("AC outdoor unit caught fire and emitting heavy smoke in server room", "Electrical", "HIGH"),
    ("High voltage fluctuation in biotechnology laboratory causing machine rebooting", "Electrical", "HIGH"),
    ("Emergency exit lights not working during power outage on 4th floor staircase", "Electrical", "HIGH"),
    ("Heavy sparking in overhead wiring near main campus gate during rain", "Electrical", "HIGH"),
    ("MCB blast in mechanical workshop, all power lines dead", "Electrical", "HIGH"),
    ("Exposed wires hanging low from ceiling in corridor, students could get shocked", "Electrical", "HIGH"),
    ("All electrical outlets dead across entire pharmacy research lab during practicals", "Electrical", "HIGH"),
    ("Burning plastic smell coming from AC unit in seminar hall during conference", "Electrical", "HIGH"),

    # Medium Priority (Standard defect)
    ("Ceiling fan not working in room 305, making loud humming noise", "Electrical", "MEDIUM"),
    ("Tube light flickering constantly in lecture hall 102 causing headache", "Electrical", "MEDIUM"),
    ("Wall socket near desk 4 in library is loose and not charging laptops", "Electrical", "MEDIUM"),
    ("Fan regulator broken and stuck on speed 5 in classroom 12", "Electrical", "MEDIUM"),
    ("Two lights in the corridor outside staff room are fused", "Electrical", "MEDIUM"),
    ("Geyser in hostel bathroom room 208 is not heating water", "Electrical", "MEDIUM"),
    ("Air conditioner in computer lab 3 is blowing warm air only, cooling not working", "Electrical", "MEDIUM"),
    ("Switch for the projector in room 401 is jammed and cannot be turned on", "Electrical", "MEDIUM"),
    ("Exhaust fan in chemistry lab is not functioning properly", "Electrical", "MEDIUM"),
    ("Water heater immersion switch in 1st floor washroom is not turning on", "Electrical", "MEDIUM"),
    ("LED panel light in library reading section has gone completely dark", "Electrical", "MEDIUM"),
    ("Plug point near workbench 6 in electronics lab has no electric power", "Electrical", "MEDIUM"),
    ("Wall clock and bell system in main block not receiving electrical supply", "Electrical", "MEDIUM"),
    ("Ceiling fan in room 114 shaking violently when turned on", "Electrical", "MEDIUM"),
    ("Power strip on podium in auditorium is non-functional", "Electrical", "MEDIUM"),
    ("Tube light starter clicking continuously in physics darkroom", "Electrical", "MEDIUM"),
    ("Switches on main board in nursing simulation ward are loose", "Electrical", "MEDIUM"),
    ("AC remote not working and temperature stuck at 18 degrees in conference room", "Electrical", "MEDIUM"),
    ("Geyser thermostat in boys hostel 3rd floor seems broken", "Electrical", "MEDIUM"),
    ("No power in 3 charging points near library study cubicles", "Electrical", "MEDIUM"),

    # Low Priority (Minor convenience / requests)
    ("Requesting additional power extension box near the project display area", "Electrical", "LOW"),
    ("Kindly install an extra plug point near the study table in hostel room 310", "Electrical", "LOW"),
    ("Suggestion to replace old yellow bulbs with energy efficient white LEDs in corridor", "Electrical", "LOW"),
    ("Can we have a power socket near the reading benches in the garden area", "Electrical", "LOW"),
    ("Light switch cover is slightly scratched in room 201, needs cosmetic replacement", "Electrical", "LOW"),

    # ------------------ PLUMBING ------------------
    # High Priority
    ("Main water pipeline burst on ground floor, flooding hallway and heading towards lab", "Plumbing", "HIGH"),
    ("Severe sewage overflow in ground floor washroom, foul water entering corridor", "Plumbing", "HIGH"),
    ("Complete water cut across entire girls hostel since morning, no water in taps", "Plumbing", "HIGH"),
    ("Overhead water tank overflowing heavily on the roof, water pouring into stairwell", "Plumbing", "HIGH"),
    ("Drinking water from cooler is coming out brown and muddy, health hazard", "Plumbing", "HIGH"),
    ("Severe water logging and flooding inside anatomy dissection hall", "Plumbing", "HIGH"),
    ("Drainage pipe completely choked and overflowing into basement parking", "Plumbing", "HIGH"),
    ("Dirty contaminated water flowing from hostel washbasin taps", "Plumbing", "HIGH"),
    ("Toilet pipe burst in 2nd floor washroom, water leaking down through ceiling", "Plumbing", "HIGH"),
    ("No water supply in campus hospital emergency washrooms", "Plumbing", "HIGH"),

    # Medium Priority
    ("Tap in 2nd floor boys washroom is continuously dripping and won't shut tight", "Plumbing", "MEDIUM"),
    ("Washbasin drain is draining very slowly in third floor restroom", "Plumbing", "MEDIUM"),
    ("Flush tank in toilet stall 3 is not refilling after use", "Plumbing", "MEDIUM"),
    ("Water pressure in hostel bathroom 4th floor is extremely low", "Plumbing", "MEDIUM"),
    ("Drinking water cooler near canteen is leaking water onto the floor", "Plumbing", "MEDIUM"),
    ("Health faucet pipe is cracked and spraying water in 1st floor restroom", "Plumbing", "MEDIUM"),
    ("Kitchen sink drain choked in girls hostel mess area", "Plumbing", "MEDIUM"),
    ("Commode in room 104 restroom is blocked and needs plumbing repair", "Plumbing", "MEDIUM"),
    ("RO water purifier filter near staff room needs replacement, water tastes bitter", "Plumbing", "MEDIUM"),
    ("Water cooler in pharmacy block is not dispensing cold water", "Plumbing", "MEDIUM"),
    ("Urinal flush sensor is not working in management block ground floor", "Plumbing", "MEDIUM"),
    ("Pipe joint under the washbasin in biology lab is steadily leaking", "Plumbing", "MEDIUM"),
    ("Outdoor garden tap cannot be turned off completely, wasting water", "Plumbing", "MEDIUM"),
    ("Shower head in room 312 hostel bathroom is clogged with mineral deposits", "Plumbing", "MEDIUM"),
    ("Drainage grating broken in shower area, water accumulating on floor", "Plumbing", "MEDIUM"),
    ("No cold water coming from drinking dispenser in library", "Plumbing", "MEDIUM"),
    ("Washbasin tap handle broken in faculty restroom", "Plumbing", "MEDIUM"),
    ("Water leaking behind the western commode in room 205", "Plumbing", "MEDIUM"),

    # Low Priority
    ("Requesting an additional water cooler near the sports ground pavilion", "Plumbing", "LOW"),
    ("Water pressure in garden hose is slightly low, suggestion to inspect nozzle", "Plumbing", "LOW"),
    ("Can we add a sign above the tap reminding students to turn it off firmly", "Plumbing", "LOW"),
    ("Water tap aerator is missing in washbasin 2, causes water to splash slightly", "Plumbing", "LOW"),

    # ------------------ IT & NETWORK ------------------
    # High Priority
    ("Campus internet backbone down, all servers and lab computers offline during online exam", "IT", "HIGH"),
    ("Wi-Fi down across entire campus during university semester practical submission", "IT", "HIGH"),
    ("Biometric attendance machines not functioning across all gates, students stuck outside", "IT", "HIGH"),
    ("College portal throwing 500 error, unable to download admit cards for tomorrow's exam", "IT", "HIGH"),
    ("Core network switch in computer center down, all lab sessions halted", "IT", "HIGH"),
    ("Ransomware or virus warning popups appearing on multiple lab systems", "IT", "HIGH"),
    ("Firewall blocking institutional portal and academic LMS database", "IT", "HIGH"),
    ("Critical lab server crashed during machine learning practical exam", "IT", "HIGH"),

    # Medium Priority
    ("Wi-Fi signal very weak and keeps disconnecting in hostel block A room 210", "IT", "MEDIUM"),
    ("Projector in seminar hall has blue screen and HDMI cable is not detecting laptop", "IT", "MEDIUM"),
    ("Computer 14 in computer lab 2 is stuck in boot loop and won't start Windows", "IT", "MEDIUM"),
    ("Keyboard missing several keys on PC number 8 in digital library", "IT", "MEDIUM"),
    ("Mouse not responding on system 22 in CAD simulation lab", "IT", "MEDIUM"),
    ("Network LAN port on study desk 12 is loose and has no internet connectivity", "IT", "MEDIUM"),
    ("Printer in departmental office is showing paper jam error and offline status", "IT", "MEDIUM"),
    ("Cannot login to student Wi-Fi captive portal with college credentials", "IT", "MEDIUM"),
    ("Sound system and microphone not working with PC in auditorium", "IT", "MEDIUM"),
    ("Monitor display in room 302 has vertical lines running across the screen", "IT", "MEDIUM"),
    ("Ethernet cable in faculty room is damaged and wires are severed", "IT", "MEDIUM"),
    ("Software license expired on simulation workstations in physiotherapy research lab", "IT", "MEDIUM"),
    ("Webcam not working on virtual classroom computer for remote lecture", "IT", "MEDIUM"),
    ("Student portal password reset link is taking over 2 hours to arrive in email", "IT", "MEDIUM"),
    ("Library barcode scanner not reading student ID cards at circulation desk", "IT", "MEDIUM"),
    ("VLC and office software missing from newly installed systems in lab 4", "IT", "MEDIUM"),
    ("Audio jack broken inside PC front port in language lab station 7", "IT", "MEDIUM"),

    # Low Priority
    ("Requesting faster Wi-Fi access points in the outdoor cafeteria seating area", "IT", "LOW"),
    ("Can we have mousepads provided for systems in the computer lab", "IT", "LOW"),
    ("Suggestion to install Google Chrome as default browser instead of Edge in lab systems", "IT", "LOW"),
    ("Would be nice to have Wi-Fi coverage extended to the college basketball court", "IT", "LOW"),

    # ------------------ CLEANING & SANITATION ------------------
    # High Priority
    ("Dead rat found behind cabinets in biochemistry lab, hazardous stench and health risk", "Cleaning", "HIGH"),
    ("Hospital biohazard waste bin overflowing in nursing clinic corridor", "Cleaning", "HIGH"),
    ("Severe sewage stench in ground floor classrooms, students unable to breathe", "Cleaning", "HIGH"),
    ("Chemical liquid spilled on corridor floor outside pharmacy lab, toxic odor", "Cleaning", "HIGH"),
    ("Heavy mosquito breeding in stagnant water near hostel entrance, dengue risk", "Cleaning", "HIGH"),
    ("Food rotting and severe pest infestation in hostel pantry area", "Cleaning", "HIGH"),
    ("Glass bottle shattered and spilled chemicals on aisle floor in chemistry lab", "Cleaning", "HIGH"),

    # Medium Priority
    ("Washroom on 3rd floor block B is extremely dirty and requires thorough scrubbing", "Cleaning", "MEDIUM"),
    ("Dustbins outside lecture hall 104 are overflowing with food waste and wrappers", "Cleaning", "MEDIUM"),
    ("Classroom 206 floor is muddy and sticky after morning rain, needs mopping", "Cleaning", "MEDIUM"),
    ("Sanitary napkin disposal bin in 2nd floor ladies restroom is full", "Cleaning", "MEDIUM"),
    ("Cobwebs covering ceiling corners and windows in physics lab", "Cleaning", "MEDIUM"),
    ("Spilled coffee and stain on carpet in seminar room", "Cleaning", "MEDIUM"),
    ("Washroom mirrors dirty and soap dispensers empty in academic block", "Cleaning", "MEDIUM"),
    ("Dust accumulating on books and desks in back rows of library", "Cleaning", "MEDIUM"),
    ("Corridor outside legal aid clinic has not been swept for two days", "Cleaning", "MEDIUM"),
    ("Water dispenser tray dirty and covered with algae", "Cleaning", "MEDIUM"),
    ("Black mold stains appearing on bathroom tiles in hostel room 108", "Cleaning", "MEDIUM"),
    ("Graffiti and pencil scribbles on desks in room 301 need cleaning", "Cleaning", "MEDIUM"),
    ("Discarded lunch boxes left in lawn area attracting crows and flies", "Cleaning", "MEDIUM"),
    ("Window glass dusty and bird droppings on windowsill in lecture hall", "Cleaning", "MEDIUM"),

    # Low Priority
    ("Requesting an extra recycling dustbin near the campus stationery shop", "Cleaning", "LOW"),
    ("Suggestion to place wet floor warning boards when mopping the cafeteria", "Cleaning", "LOW"),
    ("Can we have air freshener installed in the ground floor faculty washroom", "Cleaning", "LOW"),
    ("Minor dust on window blinds in management faculty cubicles", "Cleaning", "LOW"),

    # ------------------ MAINTENANCE (FURNITURE & INFRASTRUCTURE) ------------------
    # High Priority
    ("Elevator / lift in main academic block got stuck between 3rd and 4th floor with students inside", "Maintenance", "HIGH"),
    ("Large concrete chunk fell from ceiling near staircase landing, near-miss injury", "Maintenance", "HIGH"),
    ("Window glass shattered and hanging loosely on 4th floor, severe wind danger to people below", "Maintenance", "HIGH"),
    ("Staircase handrail is completely detached and loose, someone could fall over edge", "Maintenance", "HIGH"),
    ("Heavy iron main gate hinge broken and leaning dangerously", "Maintenance", "HIGH"),
    ("Ceiling plaster cracked and sagging heavily in classroom 210, immediate collapse hazard", "Maintenance", "HIGH"),
    ("Lab door jammed shut from outside with students trapped inside chemistry room", "Maintenance", "HIGH"),

    # Medium Priority
    ("Wooden bench in room 103 has a loose plank and protruding sharp nail", "Maintenance", "MEDIUM"),
    ("Classroom door handle and lock are broken, cannot close the door properly", "Maintenance", "MEDIUM"),
    ("Chair wheel broken in computer lab, student chair wobbles unstable", "Maintenance", "MEDIUM"),
    ("Whiteboard in lecture hall 304 is chipped and marker ink does not erase", "Maintenance", "MEDIUM"),
    ("Window latch broken in hostel room 214, window bangs open in wind", "Maintenance", "MEDIUM"),
    ("Desks in row 3 of moot court hall are shaking and screws are missing", "Maintenance", "MEDIUM"),
    ("Tile cracked on corridor floor, students tripping over the edge", "Maintenance", "MEDIUM"),
    ("Notice board glass frame hinge broken in administrative corridor", "Maintenance", "MEDIUM"),
    ("Curtain rod fell down in nursing practical demonstration ward", "Maintenance", "MEDIUM"),
    ("Door closer pneumatic arm leaking oil and slamming door shut loudly", "Maintenance", "MEDIUM"),
    ("Dampness and paint peeling off from exterior wall of library block", "Maintenance", "MEDIUM"),
    ("Podium microphone stand broken in auditorium stage", "Maintenance", "MEDIUM"),
    ("Desk drawer jammed and won't open in pharmacy research lab", "Maintenance", "MEDIUM"),
    ("Locker key broken inside locker door in girls hostel locker room", "Maintenance", "MEDIUM"),
    ("Staircase step edge marble cracked on 2nd floor staircase", "Maintenance", "MEDIUM"),

    # Low Priority
    ("Suggestion to repaint the faded college parking lines", "Maintenance", "LOW"),
    ("Notice board border paint is chipping in sports complex hallway", "Maintenance", "LOW"),
    ("Can we add cushions to the wooden chairs in the seminar hall", "Maintenance", "LOW"),
    ("Request to adjust the angle of the projection screen in classroom 101", "Maintenance", "LOW"),

    # ------------------ ADMINISTRATION ------------------
    # High Priority
    ("Admit card hall ticket not generated and university semester exam begins tomorrow", "Administration", "HIGH"),
    ("College bus broke down on highway with students stranded without transport", "Administration", "HIGH"),
    ("Wrong marks or absence recorded in official internal marks list published today", "Administration", "HIGH"),
    ("Canteen food served today has foul smell and students falling sick, inspect immediately", "Administration", "HIGH"),
    ("Scholarship application deadline is today but college verification portal shows pending", "Administration", "HIGH"),
    ("Examination registration fee debited twice from bank but status still showing unpaid", "Administration", "HIGH"),

    # Medium Priority
    ("Fee receipt has not been issued after payment made 5 days ago in accounts office", "Administration", "MEDIUM"),
    ("Bonafide certificate request pending with administration office for over 1 week", "Administration", "MEDIUM"),
    ("Campus identity card damaged and barcode unreadable, need replacement card", "Administration", "MEDIUM"),
    ("College bus route 7 arriving 30 minutes late every morning at campus stop", "Administration", "MEDIUM"),
    ("Library fine calculation error showing incorrect late charges on student account", "Administration", "MEDIUM"),
    ("Timetable clash between two core subjects in 3rd year law schedule", "Administration", "MEDIUM"),
    ("Hostel room allocation receipt not received after room deposit payment", "Administration", "MEDIUM"),
    ("Attendance percentage showing 0 in nursing clinical posting despite regular attendance", "Administration", "MEDIUM"),
    ("Canteen menu has very few hygienic breakfast options available before 9am", "Administration", "MEDIUM"),
    ("Bus pass sticker peeling and bus conductor refusing boarding without fresh stamp", "Administration", "MEDIUM"),
    ("Document verification pending for internship permission letter in principal office", "Administration", "MEDIUM"),

    # Low Priority
    ("Requesting college canteen to accept UPI QR code payments in addition to cash", "Administration", "LOW"),
    ("Suggestion to extend library closing hours until 9pm during study holidays", "Administration", "LOW"),
    ("Can the college store keep extra blue examination record books in stock", "Administration", "LOW"),
    ("Request to set up a student lost and found desk near reception", "Administration", "LOW"),

    # ------------------ OTHER ------------------
    # General / Miscellaneous
    ("Lost my water bottle and blue spiral notebook near the library lawn yesterday", "Other", "LOW"),
    ("Found a set of motorcycle keys near the basketball court, handed to guard", "Other", "LOW"),
    ("Inquiry regarding annual sports day date and registration procedure", "Other", "LOW"),
    ("Is there any update on the campus cultural fest schedule this semester", "Other", "LOW"),
    ("Lost black spectacles in computer lab 2 during afternoon session", "Other", "LOW"),
    ("General inquiry regarding campus placement training session timings", "Other", "LOW"),
    ("Suggestion for arranging a college blood donation camp next month", "Other", "LOW"),
]

# Variations and data augmentation templates to produce a diverse 750+ item dataset
LOCATIONS = [
    "in Room 101", "in Room 204", "in Room 305", "in Room 410",
    "in Computer Lab 1", "in Pharmacy Lab", "in Nursing Simulation Ward",
    "in Physiotherapy Clinic", "in Moot Court Hall", "in Central Library",
    "in Boys Hostel Block A", "in Girls Hostel Block B", "in College Canteen",
    "in 1st Floor Corridor", "in Ground Floor Washroom", "in Seminar Hall",
    "in Auditorium", "near Main Gate", "in Sports Complex", "near Parking Area"
]

VARIATIONS_PREFIX = [
    "Urgent issue:", "Please resolve:", "Complaint regarding", "Facing problem:",
    "Report:", "Kindly fix:", "Immediate attention needed:", "Student complaint:"
]

def generate_dataset():
    records = []
    
    # Add base records
    for text, cat, pri in COMPLAINTS_DATA:
        records.append((text, cat, pri))
    
    # Generate realistic combinations and augmentations
    for text, cat, pri in COMPLAINTS_DATA:
        # Add variation with location
        loc = random.choice(LOCATIONS)
        if loc.lower() not in text.lower():
            varied_text = f"{text} {loc}"
            records.append((varied_text, cat, pri))
            
        # Add variation with prefix
        prefix = random.choice(VARIATIONS_PREFIX)
        varied_text_2 = f"{prefix} {text.lower()}"
        records.append((varied_text_2, cat, pri))
        
        # Add colloquial / student style variations
        if pri == "HIGH":
            records.append((f"Very urgent: {text}! Please take action quickly as students are affected.", cat, pri))
        elif pri == "LOW":
            records.append((f"Suggestion for campus management: {text}.", cat, pri))
        else:
            records.append((f"There is an issue with {text.lower()} since yesterday.", cat, pri))

    # Shuffle records
    random.shuffle(records)

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "category", "priority"])
        for r in records:
            writer.writerow(r)

    print(f"Generated {len(records)} realistic campus complaint records at {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_dataset()
