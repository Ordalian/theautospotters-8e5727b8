export interface CarModel {
  name: string;
  years: [number, number]; // [start, end]
}

export interface CarBrand {
  name: string;
  models: CarModel[];
}

export const carBrands: CarBrand[] = [
  {
    name: "Alfa Romeo",
    models: [
      { name: "Giulia", years: [2016, 2026] },
      { name: "Stelvio", years: [2017, 2026] },
      { name: "4C", years: [2013, 2020] },
      { name: "Tonale", years: [2022, 2026] },
      { name: "GTV", years: [1995, 2005] },
      { name: "Spider", years: [1966, 1994] },
      { name: "33 Stradale", years: [2024, 2026] },
    ],
  },
  {
    name: "Aston Martin",
    models: [
      { name: "DB11", years: [2016, 2026] },
      { name: "DB12", years: [2023, 2026] },
      { name: "Vantage", years: [2005, 2026] },
      { name: "DBS Superleggera", years: [2018, 2023] },
      { name: "DBX", years: [2020, 2026] },
      { name: "Valkyrie", years: [2021, 2026] },
      { name: "Vanquish", years: [2001, 2018] },
    ],
  },
  {
    name: "Audi",
    models: [
      { name: "A3", years: [1996, 2026] },
      { name: "A4", years: [1994, 2026] },
      { name: "A5", years: [2007, 2026] },
      { name: "A6", years: [1994, 2026] },
      { name: "A7", years: [2010, 2026] },
      { name: "A8", years: [1994, 2026] },
      { name: "Q3", years: [2011, 2026] },
      { name: "Q5", years: [2008, 2026] },
      { name: "Q7", years: [2005, 2026] },
      { name: "Q8", years: [2018, 2026] },
      { name: "e-tron GT", years: [2021, 2026] },
      { name: "R8", years: [2006, 2024] },
      { name: "RS3", years: [2011, 2026] },
      { name: "RS5", years: [2010, 2026] },
      { name: "RS6", years: [2002, 2026] },
      { name: "RS7", years: [2013, 2026] },
      { name: "TT", years: [1998, 2023] },
      { name: "RS e-tron GT", years: [2021, 2026] },
    ],
  },
  {
    name: "Bentley",
    models: [
      { name: "Continental GT", years: [2003, 2026] },
      { name: "Flying Spur", years: [2005, 2026] },
      { name: "Bentayga", years: [2016, 2026] },
      { name: "Bacalar", years: [2021, 2023] },
      { name: "Batur", years: [2023, 2026] },
    ],
  },
  {
    name: "BMW",
    models: [
      { name: "1 Series", years: [2004, 2026] },
      { name: "2 Series", years: [2014, 2026] },
      { name: "3 Series", years: [1975, 2026] },
      { name: "4 Series", years: [2013, 2026] },
      { name: "5 Series", years: [1972, 2026] },
      { name: "7 Series", years: [1977, 2026] },
      { name: "8 Series", years: [2018, 2026] },
      { name: "X1", years: [2009, 2026] },
      { name: "X3", years: [2003, 2026] },
      { name: "X5", years: [1999, 2026] },
      { name: "X6", years: [2008, 2026] },
      { name: "X7", years: [2019, 2026] },
      { name: "Z4", years: [2002, 2026] },
      { name: "M2", years: [2016, 2026] },
      { name: "M3", years: [1986, 2026] },
      { name: "M4", years: [2014, 2026] },
      { name: "M5", years: [1985, 2026] },
      { name: "M8", years: [2019, 2026] },
      { name: "i4", years: [2021, 2026] },
      { name: "iX", years: [2021, 2026] },
    ],
  },
  {
    name: "Bugatti",
    models: [
      { name: "Chiron", years: [2016, 2024] },
      { name: "Veyron", years: [2005, 2015] },
      { name: "Divo", years: [2019, 2021] },
      { name: "Centodieci", years: [2022, 2024] },
      { name: "Bolide", years: [2024, 2026] },
      { name: "Tourbillon", years: [2026, 2026] },
    ],
  },
  {
    name: "Cadillac",
    models: [
      { name: "CT5-V", years: [2020, 2026] },
      { name: "Escalade", years: [1999, 2026] },
      { name: "CT4", years: [2020, 2026] },
      { name: "XT5", years: [2017, 2026] },
      { name: "Lyriq", years: [2023, 2026] },
    ],
  },
  {
    name: "Chevrolet",
    models: [
      { name: "Corvette", years: [1953, 2026] },
      { name: "Camaro", years: [1967, 2024] },
      { name: "Silverado", years: [1999, 2026] },
      { name: "Tahoe", years: [1995, 2026] },
      { name: "Blazer", years: [2019, 2026] },
      { name: "Equinox", years: [2005, 2026] },
    ],
  },
  {
    name: "Dodge",
    models: [
      { name: "Challenger", years: [2008, 2024] },
      { name: "Charger", years: [2006, 2026] },
      { name: "Durango", years: [1998, 2026] },
      { name: "Viper", years: [1991, 2017] },
      { name: "Hornet", years: [2023, 2026] },
    ],
  },
  {
    name: "Ferrari",
    models: [
      { name: "296 GTB", years: [2022, 2026] },
      { name: "296 GTS", years: [2023, 2026] },
      { name: "SF90 Stradale", years: [2020, 2026] },
      { name: "F8 Tributo", years: [2019, 2023] },
      { name: "Roma", years: [2020, 2026] },
      { name: "812 Superfast", years: [2017, 2023] },
      { name: "Purosangue", years: [2023, 2026] },
      { name: "488 GTB", years: [2015, 2020] },
      { name: "LaFerrari", years: [2013, 2018] },
      { name: "458 Italia", years: [2009, 2015] },
      { name: "California", years: [2009, 2017] },
      { name: "F40", years: [1987, 1992] },
      { name: "F50", years: [1995, 1997] },
      { name: "Enzo", years: [2002, 2004] },
      { name: "Testarossa", years: [1984, 1996] },
      { name: "Daytona SP3", years: [2022, 2026] },
      { name: "12Cilindri", years: [2024, 2026] },
    ],
  },
  {
    name: "Fiat",
    models: [
      { name: "500", years: [2007, 2026] },
      { name: "500X", years: [2014, 2026] },
      { name: "Panda", years: [1980, 2026] },
      { name: "Tipo", years: [2015, 2026] },
      { name: "124 Spider", years: [2016, 2020] },
    ],
  },
  {
    name: "Ford",
    models: [
      { name: "Mustang", years: [1964, 2026] },
      { name: "GT", years: [2005, 2026] },
      { name: "F-150", years: [1975, 2026] },
      { name: "Bronco", years: [2021, 2026] },
      { name: "Explorer", years: [1991, 2026] },
      { name: "Focus RS", years: [2002, 2018] },
      { name: "Fiesta ST", years: [2005, 2019] },
      { name: "Puma", years: [2019, 2026] },
      { name: "Raptor", years: [2010, 2026] },
      { name: "Maverick", years: [2022, 2026] },
    ],
  },
  {
    name: "Honda",
    models: [
      { name: "Civic", years: [1972, 2026] },
      { name: "Civic Type R", years: [1997, 2026] },
      { name: "NSX", years: [1990, 2022] },
      { name: "S2000", years: [1999, 2009] },
      { name: "Accord", years: [1976, 2026] },
      { name: "CR-V", years: [1997, 2026] },
      { name: "HR-V", years: [2015, 2026] },
    ],
  },
  {
    name: "Hyundai",
    models: [
      { name: "Ioniq 5 N", years: [2024, 2026] },
      { name: "i20 N", years: [2021, 2026] },
      { name: "i30 N", years: [2017, 2026] },
      { name: "Tucson", years: [2004, 2026] },
      { name: "Kona", years: [2017, 2026] },
      { name: "Santa Fe", years: [2001, 2026] },
    ],
  },
  {
    name: "Jaguar",
    models: [
      { name: "F-Type", years: [2013, 2024] },
      { name: "F-Pace", years: [2016, 2026] },
      { name: "XE", years: [2015, 2024] },
      { name: "XF", years: [2007, 2024] },
      { name: "E-Type", years: [1961, 1975] },
      { name: "XJ220", years: [1992, 1994] },
    ],
  },
  {
    name: "Koenigsegg",
    models: [
      { name: "Jesko", years: [2022, 2026] },
      { name: "Gemera", years: [2024, 2026] },
      { name: "Regera", years: [2016, 2021] },
      { name: "Agera RS", years: [2015, 2018] },
      { name: "One:1", years: [2014, 2015] },
      { name: "CC850", years: [2023, 2026] },
    ],
  },
  {
    name: "Lamborghini",
    models: [
      { name: "Huracán", years: [2014, 2024] },
      { name: "Revuelto", years: [2024, 2026] },
      { name: "Urus", years: [2018, 2026] },
      { name: "Aventador", years: [2011, 2023] },
      { name: "Gallardo", years: [2003, 2013] },
      { name: "Murciélago", years: [2001, 2010] },
      { name: "Countach", years: [1974, 2023] },
      { name: "Diablo", years: [1990, 2001] },
      { name: "Temerario", years: [2025, 2026] },
    ],
  },
  {
    name: "Land Rover",
    models: [
      { name: "Range Rover", years: [1970, 2026] },
      { name: "Range Rover Sport", years: [2005, 2026] },
      { name: "Defender", years: [2020, 2026] },
      { name: "Discovery", years: [1989, 2026] },
      { name: "Evoque", years: [2011, 2026] },
    ],
  },
  {
    name: "Lexus",
    models: [
      { name: "LC", years: [2017, 2026] },
      { name: "LFA", years: [2010, 2012] },
      { name: "IS", years: [1999, 2026] },
      { name: "RX", years: [1998, 2026] },
      { name: "NX", years: [2014, 2026] },
      { name: "GX", years: [2002, 2026] },
    ],
  },
  {
    name: "Lotus",
    models: [
      { name: "Emira", years: [2022, 2026] },
      { name: "Eletre", years: [2023, 2026] },
      { name: "Evija", years: [2024, 2026] },
      { name: "Exige", years: [2000, 2021] },
      { name: "Elise", years: [1996, 2021] },
    ],
  },
  {
    name: "Maserati",
    models: [
      { name: "MC20", years: [2021, 2026] },
      { name: "GranTurismo", years: [2007, 2026] },
      { name: "Grecale", years: [2022, 2026] },
      { name: "Ghibli", years: [2013, 2024] },
      { name: "Levante", years: [2016, 2024] },
      { name: "Quattroporte", years: [2003, 2024] },
    ],
  },
  {
    name: "Mazda",
    models: [
      { name: "MX-5 Miata", years: [1989, 2026] },
      { name: "RX-7", years: [1978, 2002] },
      { name: "RX-8", years: [2003, 2012] },
      { name: "3", years: [2003, 2026] },
      { name: "CX-5", years: [2012, 2026] },
      { name: "CX-90", years: [2024, 2026] },
    ],
  },
  {
    name: "McLaren",
    models: [
      { name: "720S", years: [2017, 2024] },
      { name: "750S", years: [2023, 2026] },
      { name: "Artura", years: [2022, 2026] },
      { name: "P1", years: [2013, 2015] },
      { name: "Senna", years: [2018, 2020] },
      { name: "Speedtail", years: [2020, 2022] },
      { name: "F1", years: [1992, 1998] },
      { name: "Elva", years: [2021, 2022] },
      { name: "W1", years: [2025, 2026] },
    ],
  },
  {
    name: "Mercedes-Benz",
    models: [
      { name: "A-Class", years: [1997, 2026] },
      { name: "C-Class", years: [1993, 2026] },
      { name: "E-Class", years: [1993, 2026] },
      { name: "S-Class", years: [1972, 2026] },
      { name: "CLA", years: [2013, 2026] },
      { name: "CLS", years: [2004, 2024] },
      { name: "GLA", years: [2014, 2026] },
      { name: "GLC", years: [2015, 2026] },
      { name: "GLE", years: [2015, 2026] },
      { name: "GLS", years: [2016, 2026] },
      { name: "G-Class", years: [1979, 2026] },
      { name: "AMG GT", years: [2015, 2026] },
      { name: "SL", years: [1954, 2026] },
      { name: "EQS", years: [2021, 2026] },
      { name: "AMG One", years: [2022, 2024] },
      { name: "CLK GTR", years: [1998, 1999] },
      { name: "SLR McLaren", years: [2003, 2010] },
    ],
  },
  {
    name: "Mini",
    models: [
      { name: "Cooper", years: [2001, 2026] },
      { name: "Cooper S", years: [2002, 2026] },
      { name: "John Cooper Works", years: [2008, 2026] },
      { name: "Countryman", years: [2010, 2026] },
    ],
  },
  {
    name: "Mitsubishi",
    models: [
      { name: "Lancer Evolution", years: [1992, 2016] },
      { name: "Eclipse Cross", years: [2018, 2026] },
      { name: "Outlander", years: [2001, 2026] },
      { name: "3000GT", years: [1990, 2001] },
    ],
  },
  {
    name: "Nissan",
    models: [
      { name: "GT-R", years: [2007, 2026] },
      { name: "370Z", years: [2009, 2020] },
      { name: "Z", years: [2023, 2026] },
      { name: "Skyline", years: [1957, 2002] },
      { name: "Silvia", years: [1965, 2002] },
      { name: "Juke", years: [2010, 2026] },
      { name: "Qashqai", years: [2006, 2026] },
    ],
  },
  {
    name: "Pagani",
    models: [
      { name: "Huayra", years: [2012, 2026] },
      { name: "Utopia", years: [2023, 2026] },
      { name: "Zonda", years: [1999, 2017] },
    ],
  },
  {
    name: "Peugeot",
    models: [
      { name: "208", years: [2012, 2026] },
      { name: "308", years: [2007, 2026] },
      { name: "508", years: [2011, 2026] },
      { name: "2008", years: [2013, 2026] },
      { name: "3008", years: [2009, 2026] },
      { name: "5008", years: [2009, 2026] },
    ],
  },
  {
    name: "Porsche",
    models: [
      { name: "911", years: [1964, 2026] },
      { name: "718 Cayman", years: [2016, 2026] },
      { name: "718 Boxster", years: [2016, 2026] },
      { name: "Taycan", years: [2020, 2026] },
      { name: "Cayenne", years: [2002, 2026] },
      { name: "Macan", years: [2014, 2026] },
      { name: "Panamera", years: [2009, 2026] },
      { name: "Carrera GT", years: [2004, 2007] },
      { name: "918 Spyder", years: [2013, 2015] },
      { name: "GT3", years: [1999, 2026] },
      { name: "GT2 RS", years: [2010, 2023] },
    ],
  },
  {
    name: "Renault",
    models: [
      { name: "Mégane RS", years: [2004, 2024] },
      { name: "Clio", years: [1990, 2026] },
      { name: "Alpine A110", years: [2018, 2026] },
      { name: "Captur", years: [2013, 2026] },
      { name: "Arkana", years: [2021, 2026] },
    ],
  },
  {
    name: "Rolls-Royce",
    models: [
      { name: "Phantom", years: [2003, 2026] },
      { name: "Ghost", years: [2010, 2026] },
      { name: "Wraith", years: [2013, 2024] },
      { name: "Cullinan", years: [2018, 2026] },
      { name: "Spectre", years: [2023, 2026] },
      { name: "Dawn", years: [2015, 2024] },
    ],
  },
  {
    name: "Subaru",
    models: [
      { name: "WRX", years: [2002, 2026] },
      { name: "BRZ", years: [2012, 2026] },
      { name: "Impreza", years: [1992, 2026] },
      { name: "Outback", years: [1995, 2026] },
      { name: "Forester", years: [1997, 2026] },
    ],
  },
  {
    name: "Tesla",
    models: [
      { name: "Model S", years: [2012, 2026] },
      { name: "Model 3", years: [2017, 2026] },
      { name: "Model X", years: [2015, 2026] },
      { name: "Model Y", years: [2020, 2026] },
      { name: "Cybertruck", years: [2024, 2026] },
      { name: "Roadster", years: [2008, 2012] },
    ],
  },
  {
    name: "Toyota",
    models: [
      { name: "Supra", years: [1978, 2026] },
      { name: "GR86", years: [2022, 2026] },
      { name: "GR Yaris", years: [2020, 2026] },
      { name: "GR Corolla", years: [2023, 2026] },
      { name: "Land Cruiser", years: [1951, 2026] },
      { name: "Camry", years: [1982, 2026] },
      { name: "Corolla", years: [1966, 2026] },
      { name: "RAV4", years: [1994, 2026] },
      { name: "Hilux", years: [1968, 2026] },
    ],
  },
  {
    name: "Volkswagen",
    models: [
      { name: "Golf", years: [1974, 2026] },
      { name: "Golf GTI", years: [1976, 2026] },
      { name: "Golf R", years: [2010, 2026] },
      { name: "Polo", years: [1975, 2026] },
      { name: "Tiguan", years: [2007, 2026] },
      { name: "Touareg", years: [2002, 2026] },
      { name: "ID.4", years: [2021, 2026] },
      { name: "Arteon", years: [2017, 2026] },
      { name: "Scirocco", years: [1974, 2017] },
      { name: "Corrado", years: [1988, 1995] },
      { name: "Passat", years: [1973, 2026] },
      { name: "T-Roc", years: [2017, 2026] },
    ],
  },
  {
    name: "Volvo",
    models: [
      { name: "XC40", years: [2018, 2026] },
      { name: "XC60", years: [2008, 2026] },
      { name: "XC90", years: [2002, 2026] },
      { name: "S60", years: [2000, 2026] },
      { name: "S90", years: [2016, 2026] },
      { name: "V60", years: [2010, 2026] },
      { name: "C30", years: [2006, 2013] },
      { name: "V90", years: [2016, 2026] },
    ],
  },
  {
    name: "Acura",
    models: [
      { name: "NSX", years: [2016, 2022] },
      { name: "Integra", years: [2023, 2026] },
      { name: "TLX", years: [2015, 2026] },
      { name: "MDX", years: [2001, 2026] },
      { name: "RDX", years: [2007, 2026] },
    ],
  },
  {
    name: "Cupra",
    models: [
      { name: "Formentor", years: [2020, 2026] },
      { name: "Leon", years: [2020, 2026] },
      { name: "Born", years: [2021, 2026] },
      { name: "Tavascan", years: [2024, 2026] },
      { name: "Ateca", years: [2020, 2024] },
    ],
  },
  {
    name: "Citroën",
    models: [
      { name: "C3", years: [2002, 2026] },
      { name: "C4", years: [2004, 2026] },
      { name: "C5 X", years: [2022, 2026] },
      { name: "Berlingo", years: [1996, 2026] },
      { name: "DS3", years: [2010, 2019] },
    ],
  },
  {
    name: "Dacia",
    models: [
      { name: "Duster", years: [2010, 2026] },
      { name: "Sandero", years: [2008, 2026] },
      { name: "Spring", years: [2021, 2026] },
      { name: "Jogger", years: [2022, 2026] },
    ],
  },
  {
    name: "DS Automobiles",
    models: [
      { name: "DS 3", years: [2019, 2026] },
      { name: "DS 4", years: [2021, 2026] },
      { name: "DS 7", years: [2018, 2026] },
      { name: "DS 9", years: [2020, 2026] },
    ],
  },
  {
    name: "Genesis",
    models: [
      { name: "G70", years: [2018, 2026] },
      { name: "G80", years: [2017, 2026] },
      { name: "G90", years: [2017, 2026] },
      { name: "GV70", years: [2021, 2026] },
      { name: "GV80", years: [2020, 2026] },
    ],
  },
  {
    name: "Infiniti",
    models: [
      { name: "Q50", years: [2014, 2026] },
      { name: "Q60", years: [2017, 2024] },
      { name: "QX50", years: [2019, 2026] },
      { name: "QX80", years: [2011, 2026] },
    ],
  },
  {
    name: "Kia",
    models: [
      { name: "Stinger", years: [2018, 2024] },
      { name: "EV6", years: [2022, 2026] },
      { name: "Sportage", years: [1993, 2026] },
      { name: "Sorento", years: [2002, 2026] },
      { name: "Ceed", years: [2007, 2026] },
      { name: "Picanto", years: [2004, 2026] },
    ],
  },
  {
    name: "Lancia",
    models: [
      { name: "Delta", years: [1979, 2014] },
      { name: "Stratos", years: [1973, 1978] },
      { name: "037", years: [1982, 1983] },
      { name: "Ypsilon", years: [2003, 2026] },
      { name: "Gamma", years: [2024, 2026] },
    ],
  },
  {
    name: "Lincoln",
    models: [
      { name: "Navigator", years: [1998, 2026] },
      { name: "Aviator", years: [2020, 2026] },
      { name: "Corsair", years: [2020, 2026] },
    ],
  },
  {
    name: "Lucid",
    models: [
      { name: "Air", years: [2022, 2026] },
      { name: "Gravity", years: [2025, 2026] },
    ],
  },
  {
    name: "Morgan",
    models: [
      { name: "Plus Four", years: [2020, 2026] },
      { name: "Plus Six", years: [2019, 2026] },
      { name: "Super 3", years: [2022, 2026] },
    ],
  },
  {
    name: "Opel",
    models: [
      { name: "Corsa", years: [1982, 2026] },
      { name: "Astra", years: [1991, 2026] },
      { name: "Mokka", years: [2012, 2026] },
      { name: "Grandland", years: [2017, 2026] },
      { name: "Insignia", years: [2008, 2024] },
    ],
  },
  {
    name: "Polestar",
    models: [
      { name: "1", years: [2019, 2021] },
      { name: "2", years: [2020, 2026] },
      { name: "3", years: [2024, 2026] },
      { name: "4", years: [2024, 2026] },
    ],
  },
  {
    name: "Rimac",
    models: [
      { name: "Nevera", years: [2021, 2026] },
      { name: "Concept One", years: [2013, 2014] },
    ],
  },
  {
    name: "Rivian",
    models: [
      { name: "R1T", years: [2022, 2026] },
      { name: "R1S", years: [2022, 2026] },
      { name: "R2", years: [2026, 2026] },
    ],
  },
  {
    name: "Seat",
    models: [
      { name: "Leon", years: [1999, 2026] },
      { name: "Ibiza", years: [1984, 2026] },
      { name: "Arona", years: [2017, 2026] },
      { name: "Ateca", years: [2016, 2026] },
    ],
  },
  {
    name: "Skoda",
    models: [
      { name: "Octavia", years: [1996, 2026] },
      { name: "Superb", years: [2001, 2026] },
      { name: "Kodiaq", years: [2017, 2026] },
      { name: "Kamiq", years: [2019, 2026] },
      { name: "Fabia", years: [1999, 2026] },
      { name: "Enyaq", years: [2021, 2026] },
    ],
  },
  {
    name: "Smart",
    models: [
      { name: "ForTwo", years: [1998, 2024] },
      { name: "ForFour", years: [2004, 2024] },
      { name: "#1", years: [2023, 2026] },
      { name: "#3", years: [2024, 2026] },
    ],
  },
  {
    name: "SSC",
    models: [
      { name: "Tuatara", years: [2020, 2026] },
      { name: "Ultimate Aero", years: [2007, 2013] },
    ],
  },
  {
    name: "Suzuki",
    models: [
      { name: "Swift Sport", years: [2005, 2026] },
      { name: "Jimny", years: [1998, 2026] },
      { name: "Vitara", years: [1988, 2026] },
      { name: "S-Cross", years: [2014, 2026] },
    ],
  },
  {
    name: "Wiesmann",
    models: [
      { name: "Project Thunderball", years: [2024, 2026] },
      { name: "MF5", years: [2009, 2014] },
      { name: "GT", years: [2003, 2013] },
    ],
  },
];

export function getModelsForBrand(brandName: string): CarModel[] {
  const brand = carBrands.find((b) => b.name === brandName);
  return brand ? brand.models : [];
}

export function getYearsForModel(brandName: string, modelName: string): number[] {
  const models = getModelsForBrand(brandName);
  const model = models.find((m) => m.name === modelName);
  if (!model) return [];
  const years: number[] = [];
  for (let y = model.years[1]; y >= model.years[0]; y--) {
    years.push(y);
  }
  return years;
}
