// Jobs. pay is yearly in base units; multiplied by country economy. edu: 0 none, 1 high school, 2 university.
export const CAREERS = [
  { id: 'paper', name: 'Paper Delivery', pay: 1500, minAge: 12, maxAge: 17, edu: 0, part: true },
  { id: 'cashier', name: 'Cashier', pay: 9000, minAge: 15, edu: 0, part: true },
  { id: 'teahouse', name: 'Tea House Server', pay: 11000, minAge: 15, edu: 0, part: true, sect: 'azure' },
  { id: 'laborer', name: 'Construction Laborer', pay: 24000, minAge: 18, edu: 0, stat: { strength: 35 } },
  { id: 'cook', name: 'Line Cook', pay: 26000, minAge: 18, edu: 0 },
  { id: 'guard', name: 'Security Guard', pay: 30000, minAge: 18, edu: 1, stat: { strength: 40 } },
  { id: 'clerk', name: 'Office Clerk', pay: 34000, minAge: 18, edu: 1, stat: { smarts: 40 } },
  { id: 'streamer', name: 'Streamer', pay: 8000, minAge: 16, edu: 0, fame: true, stat: { charisma: 45 } },
  { id: 'nurse', name: 'Nurse', pay: 62000, minAge: 22, edu: 2, stat: { smarts: 55 } },
  { id: 'engineer', name: 'Software Engineer', pay: 95000, minAge: 22, edu: 2, stat: { smarts: 65 } },
  { id: 'lawyer', name: 'Lawyer', pay: 120000, minAge: 23, edu: 2, stat: { smarts: 70, charisma: 50 } },
  { id: 'doctor', name: 'Doctor', pay: 190000, minAge: 25, edu: 2, stat: { smarts: 80 } },
  { id: 'hunter', name: 'Licensed Gate Hunter', pay: 70000, minAge: 18, edu: 0, realm: 1, desc: 'Clears Gates for the Hunter Association.' },
  { id: 'enforcer', name: 'Sect Enforcer', pay: 150000, minAge: 18, edu: 0, realm: 2 },
  { id: 'elder', name: 'Sect Elder', pay: 600000, minAge: 40, edu: 0, realm: 3 },
];
export const EDUCATION = ['None', 'High School', 'University'];
export const MAJORS = ['Medicine', 'Computer Science', 'Law', 'Business', 'Art', 'History', 'Engineering'];
