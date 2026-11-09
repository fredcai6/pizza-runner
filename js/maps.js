// Real-street city networks. Coordinates are the 1280x720 map picture. Lengths are in units of a city's stretch.
(function (root) {
  const MAPS = {
    newyork: {
      // Drawn on Manhattan's own grid: avenues run 29 degrees east of north. a counts streets eastward, b avenues northward.
      grid: { rot: 29, ox: 165, oy: 372, ga: 62, gb: 34 },
      start: 'bat',
      nodes: {
        'bat': { name: 'Battery Park', a: 3, b: 0, area: 0 },
        'bowl': { name: 'Bowling Green', a: 3, b: 2, area: 0 },
        'wall': { name: 'Broadway & Wall St', a: 3, b: 4, area: 0 },
        'sea': { name: 'South Street Seaport', a: 6, b: 4, area: 0 },
        'hall': { name: 'City Hall', a: 4, b: 7, area: 0 },
        'canal': { name: 'Canal St & Bowery', a: 6, b: 9, area: 0 },
        'times': { name: 'Times Square', a: 3, b: 9, area: 1 },
        'colcir': { name: 'Columbus Circle', a: 2, b: 11, area: 1 },
        'parkse': { name: 'Fifth Ave & 59th St', a: 5, b: 11, area: 1 },
        'cpn': { name: 'Harlem Meer, 110th St', a: 5, b: 14, area: 1 },
        'dumbo': { name: 'Brooklyn Bridge, DUMBO', a: 10, b: 6, area: 2 },
        'boroh': { name: 'Borough Hall', a: 10, b: 3, area: 2 },
        'prom': { name: 'Brooklyn Heights Promenade', a: 9, b: 1, area: 2 },
        'atl': { name: 'Atlantic Ave & Flatbush Ave', a: 13, b: 5, area: 2 },
        'dekalb': { name: 'Flatbush Ave & DeKalb Ave', a: 11, b: 9, area: 2 },
      },
      streets: [
        { id: 'battery-pl', name: 'Battery Place', from: 'bat', to: 'bowl', area: 0, length: 0.5 },
        { id: 'whitehall', name: 'Whitehall Street', from: 'bowl', to: 'bat', area: 0, length: 0.5 },
        { id: 'broadway-1', name: 'Broadway', from: 'bowl', to: 'wall', area: 0, length: 0.7, turn: true },
        { id: 'broadway-2', name: 'Broadway', from: 'wall', to: 'hall', area: 0, length: 0.8, via: [[3,7]] },
        { id: 'wall-st', name: 'Wall Street', from: 'wall', to: 'sea', area: 0, length: 1, turn: true, door: 0.7 },
        { id: 'south-st', name: 'South Street', from: 'sea', to: 'bat', area: 0, length: 1, via: [[6,0]] },
        { id: 'fulton', name: 'Fulton Street', from: 'sea', to: 'hall', area: 0, length: 0.6, via: [[6,7]], turn: true },
        { id: 'broadway-3', name: 'Broadway', from: 'hall', to: 'times', area: 1, length: 1, via: [[3,7]] },
        { id: 'brooklyn-bridge', name: 'Brooklyn Bridge', from: 'hall', to: 'dumbo', area: 2, length: 0.8, via: [[4,6]], turn: true },
        { id: 'bowery', name: 'The Bowery', from: 'canal', to: 'hall', area: 0, length: 0.5, via: [[4,9]] },
        { id: 'seventh-ave', name: 'Seventh Ave South', from: 'times', to: 'bowl', area: 1, length: 1.5, via: [[2,9],[2,2]], turn: true },
        { id: 'broadway-4', name: 'Broadway', from: 'times', to: 'colcir', area: 1, length: 0.7, via: [[3,11]] },
        { id: 'cps', name: 'Central Park South', from: 'colcir', to: 'parkse', area: 1, length: 0.6 },
        { id: 'fifth-1', name: 'Fifth Avenue', from: 'parkse', to: 'hall', area: 1, length: 1.2, via: [[5,7]] },
        { id: 'east-drive', name: 'East Drive', from: 'parkse', to: 'cpn', area: 1, length: 0.9, turn: true, door: 0.7 },
        { id: 'fifth-2', name: 'Fifth Avenue', from: 'cpn', to: 'hall', area: 1, length: 1.6, via: [[5,7]] },
        { id: 'park-ave', name: 'Park Avenue', from: 'cpn', to: 'hall', area: 1, length: 1, via: [[4,14]], turn: true, gated: true },
        { id: 'cadman', name: 'Cadman Plaza West', from: 'dumbo', to: 'boroh', area: 2, length: 0.5 },
        { id: 'montague', name: 'Montague Street', from: 'boroh', to: 'prom', area: 2, length: 0.8, via: [[10,1]], turn: true, door: 0.7 },
        { id: 'columbia-hts', name: 'Columbia Heights', from: 'prom', to: 'dumbo', area: 2, length: 0.6, via: [[9,6]] },
        { id: 'atlantic', name: 'Atlantic Avenue', from: 'boroh', to: 'atl', area: 2, length: 0.8, via: [[13,3]] },
        { id: 'flatbush', name: 'Flatbush Avenue', from: 'atl', to: 'dekalb', area: 2, length: 0.7, via: [[13,9]] },
        { id: 'tillary', name: 'Tillary Street', from: 'dekalb', to: 'dumbo', area: 2, length: 0.6, via: [[11,6]], turn: true },
        { id: 'manhattan-bridge', name: 'Manhattan Bridge', from: 'dekalb', to: 'canal', area: 2, length: 1 },
      ],
      addresses: ['wall-st', 'east-drive', 'montague'],
      areaLabels: [[1.0,7.2],[3,13],[11.5,4.3]],
      features: [
        { kind: 'water', points: [[-14,22],[-0.5,22],[-0.5,5],[0.5,2],[0.5,0],[1.5,-1],[5.5,-1],[6.5,0],[6.5,22],[8.5,22],[8.5,-2],[30,-2],[30,-14],[-14,-14]], name: 'Hudson River, harbor and East River' },
        { kind: 'park', points: [[2,11],[5,11],[5,14.5],[2,14.5]], name: 'Central Park' },
        { kind: 'park', points: [[16,-1.5],[19,-1.5],[19,2],[16,2]], name: 'Prospect Park' },
      ],
      backdrop: [['Houston St', 4.5, 5, 0], ['Lafayette St', 4.5, 5, 1], ['Varick St', 2, 5, 1], ['Court St', 11, 8, 1], ['Henry St', 9.5, 4.5, 1], ['Lexington Ave', 5.5, 12.5, 1]],
      landmarks: [
        { name: 'Statue of Liberty', a: 0, b: -2 },
        { name: 'Governors Island', a: 5.5, b: -3.5 },
        { name: 'Barclays Center', a: 15.2, b: 3 },
      ],
    },
    chicago: {
      start: 'mr',
      nodes: {
        'mr': { name: 'Michigan Ave & Randolph St', x: 890, y: 490, area: 0 },
        'lr': { name: 'LaSalle St & Randolph St', x: 740, y: 490, area: 0 },
        'lj': { name: 'LaSalle St & Jackson Blvd', x: 740, y: 578, area: 0 },
        'mj': { name: 'Michigan Ave & Jackson Blvd', x: 890, y: 578, area: 0 },
        'clk': { name: 'Clark St & North Ave', x: 780, y: 320, area: 1 },
        'zoo': { name: 'Lincoln Park Zoo, North Ave', x: 905, y: 255, area: 1 },
        'fuller': { name: 'Clark St & Fullerton Ave', x: 880, y: 135, area: 1 },
        'oak': { name: 'Lake Shore Dr & Oak St Beach', x: 1005, y: 330, area: 1 },
        'fd': { name: 'Fullerton Ave & Damen Ave', x: 480, y: 150, area: 2 },
        'sixc': { name: 'Six Corners, Damen & North Ave', x: 430, y: 300, area: 2 },
        'wpe': { name: 'Milwaukee Ave & Division St', x: 560, y: 405, area: 2 },
      },
      streets: [
        { id: 'randolph', name: 'Randolph Street', from: 'mr', to: 'lr', area: 0, length: 0.8 },
        { id: 'lasalle', name: 'LaSalle Street', from: 'lr', to: 'lj', area: 0, length: 0.5 },
        { id: 'clark-north', name: 'Clark Street', from: 'lr', to: 'clk', area: 1, length: 0.9, via: [[735,435],[770,380]], turn: true },
        { id: 'jackson', name: 'Jackson Boulevard', from: 'lj', to: 'mj', area: 0, length: 0.8 },
        { id: 'state-st', name: 'State Street', from: 'lj', to: 'lr', area: 0, length: 1, via: [[815,572],[815,498]], turn: true, door: 0.7 },
        { id: 'michigan-south', name: 'Michigan Avenue', from: 'mj', to: 'mr', area: 0, length: 0.5 },
        { id: 'wabash', name: 'Wabash Avenue', from: 'mr', to: 'lj', area: 0, length: 0.85, via: [[820,560]], turn: true, gated: true },
        { id: 'clark-up', name: 'Clark Street', from: 'clk', to: 'fuller', area: 1, length: 0.9, via: [[800,230]] },
        { id: 'north-ave', name: 'North Avenue', from: 'clk', to: 'zoo', area: 1, length: 0.7, turn: true },
        { id: 'stockton', name: 'Stockton Drive', from: 'zoo', to: 'fuller', area: 1, length: 0.9, via: [[915,190]], door: 0.7 },
        { id: 'cannon', name: 'Cannon Drive', from: 'zoo', to: 'oak', area: 1, length: 0.6, turn: true },
        { id: 'clark-down', name: 'Clark Street', from: 'fuller', to: 'clk', area: 1, length: 0.9, via: [[830,230]] },
        { id: 'fullerton-west', name: 'Fullerton Avenue', from: 'fuller', to: 'fd', area: 2, length: 1.6, via: [[700,128]], turn: true },
        { id: 'lake-shore', name: 'Lake Shore Drive', from: 'oak', to: 'mr', area: 0, length: 1.2, via: [[1010,430],[960,478]] },
        { id: 'damen-south', name: 'Damen Avenue', from: 'fd', to: 'sixc', area: 2, length: 0.8, via: [[470,225]] },
        { id: 'damen-north', name: 'Damen Avenue', from: 'sixc', to: 'fd', area: 2, length: 0.8, via: [[445,225]] },
        { id: 'fullerton-east', name: 'Fullerton Avenue', from: 'fd', to: 'fuller', area: 2, length: 1.6, via: [[700,160]], turn: true },
        { id: 'milwaukee', name: 'Milwaukee Avenue', from: 'sixc', to: 'wpe', area: 2, length: 0.9, via: [[480,350]], turn: true, door: 0.7 },
        { id: 'milwaukee-sw', name: 'Milwaukee Avenue', from: 'wpe', to: 'lr', area: 2, length: 1.1, via: [[690,455]] },
      ],
      addresses: ['state-st', 'stockton', 'milwaukee'],
      features: [
        { kind: 'water', points: [[1060,80],[1280,80],[1280,650],[1100,650],[1085,520],[1055,440],[1055,430],[1070,300],[1090,180]], name: 'Lake Michigan' },
        { kind: 'water', points: [[1058,428],[700,430],[696,450],[1058,446]], name: 'Chicago River' },
        { kind: 'water', points: [[700,432],[660,300],[600,160],[585,80],[610,80],[625,160],[685,300],[720,440]], name: 'North Branch' },
        { kind: 'water', points: [[696,448],[650,560],[600,650],[625,650],[672,560],[722,450]], name: 'South Branch' },
        { kind: 'park', points: [[970,90],[1040,90],[1045,310],[990,320],[975,200]], name: 'Lincoln Park' },
        { kind: 'park', points: [[915,480],[1050,480],[1050,570],[915,570]], name: 'Grant Park' },
      ],
      landmarks: [
        { name: 'Willis Tower', x: 690, y: 560 },
        { name: 'Cloud Gate', x: 900, y: 505 },
        { name: 'Navy Pier', x: 1040, y: 395 },
        { name: 'Wrigley Field', x: 830, y: 95 },
        { name: 'Lincoln Park Zoo', x: 930, y: 235 },
      ],
    },
    dc: {
      start: 'key',
      nodes: {
        'key': { name: 'Key Bridge, M St', x: 250, y: 262, area: 0 },
        'wm': { name: 'Wisconsin Ave & M St', x: 335, y: 225, area: 0 },
        'wcirc': { name: 'Washington Circle', x: 480, y: 240, area: 0 },
        'dupont': { name: 'Dupont Circle', x: 610, y: 150, area: 0 },
        'thomas': { name: 'Thomas Circle', x: 765, y: 205, area: 2 },
        'union': { name: 'Union Station', x: 1020, y: 265, area: 2 },
        'wh': { name: 'White House, 15th St', x: 615, y: 305, area: 2 },
        'mon': { name: 'Washington Monument, 15th St', x: 600, y: 425, area: 1 },
        'linc': { name: 'Lincoln Memorial', x: 430, y: 470, area: 1 },
        'jeff': { name: 'Jefferson Memorial, 14th St', x: 650, y: 540, area: 1 },
        'fed': { name: 'Federal Triangle, 7th St', x: 790, y: 335, area: 2 },
        'cap': { name: 'US Capitol', x: 965, y: 400, area: 1 },
      },
      streets: [
        { id: 'canal', name: 'Canal Road', from: 'key', to: 'wm', area: 0, length: 0.9, via: [[262,310],[300,255]] },
        { id: 'rock-creek-down', name: 'Rock Creek Parkway', from: 'key', to: 'linc', area: 0, length: 1.4, via: [[300,360]], turn: true },
        { id: 'wisconsin', name: 'Wisconsin Avenue', from: 'wm', to: 'key', area: 0, length: 0.9, via: [[310,215],[275,235]] },
        { id: 'm-st', name: 'M Street', from: 'wm', to: 'wcirc', area: 0, length: 1.2, via: [[400,205],[450,235]], turn: true, door: 0.7 },
        { id: 'penn-1', name: 'Pennsylvania Avenue', from: 'wcirc', to: 'wh', area: 2, length: 0.9 },
        { id: 'twenty-third', name: '23rd Street', from: 'wcirc', to: 'jeff', area: 0, length: 1.7, via: [[520,400]], turn: true, gated: true },
        { id: 'mass-1', name: 'Massachusetts Avenue', from: 'dupont', to: 'thomas', area: 0, length: 0.8, turn: true },
        { id: 'conn', name: 'Connecticut Avenue', from: 'dupont', to: 'wh', area: 0, length: 1, via: [[600,230]] },
        { id: 'mass-2', name: 'Massachusetts Avenue', from: 'thomas', to: 'union', area: 2, length: 1.3, via: [[900,210]] },
        { id: 'mass-west', name: 'Massachusetts Avenue', from: 'thomas', to: 'dupont', area: 0, length: 0.8, via: [[690,150]], turn: true },
        { id: 'ny-ave', name: 'New York Avenue', from: 'union', to: 'thomas', area: 2, length: 1.3, via: [[900,250]] },
        { id: 'louisiana', name: 'Louisiana Avenue', from: 'union', to: 'cap', area: 2, length: 0.8, turn: true },
        { id: 'penn-2', name: 'Pennsylvania Avenue', from: 'wh', to: 'fed', area: 2, length: 0.9 },
        { id: 'fifteenth', name: '15th Street', from: 'wh', to: 'mon', area: 1, length: 0.6, turn: true },
        { id: 'fourteenth', name: '14th Street', from: 'mon', to: 'jeff', area: 1, length: 0.7 },
        { id: 'constitution', name: 'Constitution Avenue', from: 'mon', to: 'fed', area: 2, length: 1.1, via: [[690,385]], turn: true, door: 0.7 },
        { id: 'ohio-dr', name: 'Ohio Drive', from: 'jeff', to: 'linc', area: 1, length: 1.2, via: [[540,520]] },
        { id: 'independence', name: 'Independence Avenue', from: 'jeff', to: 'cap', area: 1, length: 1.6, via: [[800,490]], turn: true, door: 0.7 },
        { id: 'constitution-w', name: 'Constitution Avenue', from: 'linc', to: 'mon', area: 1, length: 1 },
        { id: 'rock-creek-up', name: 'Rock Creek Parkway', from: 'linc', to: 'key', area: 0, length: 1.4, via: [[330,380]], turn: true },
        { id: 'penn-3', name: 'Pennsylvania Avenue', from: 'fed', to: 'cap', area: 2, length: 1 },
        { id: 'seventh', name: '7th Street', from: 'fed', to: 'jeff', area: 2, length: 1.3, turn: true },
        { id: 'delaware', name: 'Delaware Avenue', from: 'cap', to: 'union', area: 2, length: 0.8 },
        { id: 'madison', name: 'Madison Drive', from: 'cap', to: 'mon', area: 1, length: 1.7, via: [[780,435]], turn: true },
      ],
      addresses: ['m-st', 'independence', 'constitution'],
      features: [
        { kind: 'water', points: [[0,80],[150,80],[190,210],[250,300],[330,400],[400,480],[480,560],[580,650],[0,650]], name: 'Potomac River' },
        { kind: 'water', points: [[550,530],[610,520],[620,570],[560,590]], name: 'Tidal Basin' },
        { kind: 'water', points: [[1150,80],[1110,300],[1070,450],[1000,560],[900,650],[1010,650],[1110,560],[1160,430],[1210,300],[1230,80]], name: 'Anacostia River' },
        { kind: 'park', points: [[470,447],[950,383],[957,413],[480,492]], name: 'National Mall' },
        { kind: 'park', points: [[330,70],[470,70],[500,140],[400,170]], name: 'Rock Creek Park' },
      ],
      landmarks: [
        { name: 'White House', x: 650, y: 285 },
        { name: 'Washington Monument', x: 545, y: 440 },
        { name: 'Lincoln Memorial', x: 395, y: 500 },
        { name: 'US Capitol', x: 975, y: 372 },
        { name: 'Jefferson Memorial', x: 690, y: 585 },
        { name: 'Georgetown University', x: 250, y: 170 },
      ],
    },
    naples: {
      start: 'molo',
      nodes: {
        'molo': { name: 'Molo Beverello, Piazza Municipio', x: 640, y: 605, area: 0 },
        'plebi': { name: 'Piazza del Plebiscito', x: 450, y: 545, area: 0 },
        'ovo': { name: 'Castel dell\'Ovo', x: 330, y: 595, area: 0 },
        'vitt': { name: 'Piazza Vittoria', x: 200, y: 555, area: 0 },
        'tol': { name: 'Via Toledo & Piazza Carità', x: 540, y: 470, area: 1 },
        'mont': { name: 'Piazza Dante, Montesanto', x: 420, y: 335, area: 1 },
        'trib': { name: 'Via dei Tribunali & Duomo', x: 700, y: 360, area: 1 },
        'spac': { name: 'Spaccanapoli, San Biagio dei Librai', x: 700, y: 435, area: 1 },
        'gari': { name: 'Piazza Garibaldi', x: 920, y: 430, area: 1 },
        'fuga': { name: 'Piazza Fuga, Vomero', x: 330, y: 215, area: 2 },
        'scar': { name: 'Piazza Vanvitelli, Via Scarlatti', x: 210, y: 165, area: 2 },
      },
      streets: [
        { id: 'acton', name: 'Via Acton', from: 'molo', to: 'plebi', area: 0, length: 1.1 },
        { id: 'umberto', name: 'Corso Umberto I', from: 'molo', to: 'gari', area: 1, length: 1.6, via: [[780,540]], turn: true },
        { id: 'toledo-1', name: 'Via Toledo', from: 'plebi', to: 'tol', area: 0, length: 0.6 },
        { id: 'santa-lucia', name: 'Via Santa Lucia', from: 'plebi', to: 'ovo', area: 0, length: 0.7, turn: true },
        { id: 'sauro', name: 'Via Nazario Sauro', from: 'ovo', to: 'plebi', area: 0, length: 0.7, via: [[390,585]] },
        { id: 'partenope', name: 'Via Partenope', from: 'ovo', to: 'vitt', area: 0, length: 0.9, via: [[265,590]], turn: true, door: 0.7 },
        { id: 'chiaia', name: 'Via Chiaia', from: 'vitt', to: 'plebi', area: 0, length: 1, via: [[330,535]] },
        { id: 'funi-chiaia', name: 'Funicolare di Chiaia', from: 'vitt', to: 'fuga', area: 2, length: 1.5, turn: true },
        { id: 'spaccanapoli', name: 'Spaccanapoli', from: 'tol', to: 'spac', area: 1, length: 0.9, via: [[620,450]] },
        { id: 'toledo-2', name: 'Via Toledo', from: 'tol', to: 'mont', area: 1, length: 0.9, turn: true },
        { id: 'tribunali', name: 'Via dei Tribunali', from: 'mont', to: 'trib', area: 1, length: 1.3, via: [[560,355]], door: 0.7 },
        { id: 'funi-monte', name: 'Funicolare di Montesanto', from: 'mont', to: 'fuga', area: 2, length: 0.8, turn: true },
        { id: 'foria', name: 'Via Foria', from: 'trib', to: 'mont', area: 1, length: 1.3, via: [[560,300]] },
        { id: 'salvator-rosa', name: 'Via Salvator Rosa', from: 'trib', to: 'fuga', area: 2, length: 1.6, via: [[520,300]], turn: true, gated: true },
        { id: 'medina', name: 'Via Medina', from: 'spac', to: 'molo', area: 0, length: 0.8, via: [[670,520]] },
        { id: 'marina', name: 'Via Marina', from: 'gari', to: 'trib', area: 1, length: 1, via: [[820,380]] },
        { id: 'pedamentina', name: 'Pedamentina di San Martino', from: 'fuga', to: 'tol', area: 2, length: 1.4, via: [[420,340]] },
        { id: 'scarlatti', name: 'Via Scarlatti', from: 'fuga', to: 'scar', area: 2, length: 0.9, via: [[260,175]], turn: true, door: 0.7 },
        { id: 'cimarosa', name: 'Via Cimarosa', from: 'scar', to: 'fuga', area: 2, length: 0.9, via: [[260,205]] },
      ],
      addresses: ['partenope', 'tribunali', 'scarlatti'],
      features: [
        { kind: 'water', points: [[0,615],[150,640],[300,625],[480,615],[640,640],[800,650],[1000,625],[1280,570],[1280,720],[0,720]], name: 'Bay of Naples' },
        { kind: 'park', points: [[218,574],[330,588],[334,600],[218,592]], name: 'Villa Comunale' },
        { kind: 'park', points: [[790,90],[930,80],[950,190],[820,200]], name: 'Capodimonte Park' },
      ],
      landmarks: [
        { name: 'Castel dell\'Ovo', x: 330, y: 628 },
        { name: 'Castel Sant\'Elmo', x: 390, y: 150 },
        { name: 'Mount Vesuvius', x: 1140, y: 200 },
        { name: 'Galleria Umberto I', x: 470, y: 515 },
        { name: 'Naples Cathedral', x: 735, y: 335 },
        { name: 'Certosa di San Martino', x: 440, y: 185 },
      ],
    },
    california: {
      start: 'queen',
      nodes: {
        'queen': { name: 'Shoreline Dr & Queens Way', x: 200, y: 555, area: 0 },
        'shore': { name: 'Pine Ave & Shoreline Dr', x: 395, y: 590, area: 0 },
        'lbb': { name: 'Long Beach Blvd & Broadway', x: 270, y: 450, area: 0 },
        'bw': { name: 'Pine Ave & Broadway', x: 395, y: 450, area: 0 },
        'retro': { name: 'Broadway & Cherry Ave', x: 650, y: 445, area: 1 },
        'cherry': { name: 'Cherry Ave & Ocean Blvd', x: 650, y: 545, area: 1 },
        'junip': { name: 'Junipero Ave & Ocean Blvd', x: 770, y: 550, area: 2 },
        'term': { name: 'Termino Ave & Ocean Blvd, Belmont Pier', x: 960, y: 588, area: 1 },
        'pend': { name: 'End of Belmont Pier', x: 1000, y: 648, area: 1, pier: true },
        'bh': { name: 'Termino Ave & 4th St, Belmont Heights', x: 940, y: 450, area: 1 },
        'bpark': { name: 'Junipero Ave & 4th St, Bluff Park', x: 770, y: 470, area: 2 },
      },
      streets: [
        { id: 'shoreline-east', name: 'Shoreline Drive', from: 'queen', to: 'shore', area: 0, length: 1.2, via: [[300,595]] },
        { id: 'shoreline-west', name: 'Shoreline Drive', from: 'shore', to: 'queen', area: 0, length: 1.2, via: [[300,568]] },
        { id: 'lb-blvd-north', name: 'Long Beach Boulevard', from: 'queen', to: 'lbb', area: 0, length: 0.7, turn: true },
        { id: 'lb-blvd-south', name: 'Long Beach Boulevard', from: 'lbb', to: 'queen', area: 0, length: 0.7, via: [[225,500]] },
        { id: 'pine', name: 'Pine Avenue', from: 'shore', to: 'bw', area: 0, length: 0.9, turn: true, door: 0.7 },
        { id: 'broadway-west', name: 'Broadway', from: 'bw', to: 'lbb', area: 0, length: 0.6, via: [[330,430]] },
        { id: 'broadway-east', name: 'Broadway', from: 'bw', to: 'retro', area: 1, length: 1.1, turn: true },
        { id: 'fourth', name: '4th Street', from: 'retro', to: 'bpark', area: 2, length: 0.7 },
        { id: 'cherry-ave', name: 'Cherry Avenue', from: 'retro', to: 'cherry', area: 1, length: 0.5, turn: true },
        { id: 'ocean-1', name: 'Ocean Boulevard', from: 'cherry', to: 'junip', area: 1, length: 0.6 },
        { id: 'second', name: 'Second Street', from: 'cherry', to: 'term', area: 1, length: 1, via: [[800,600]], turn: true, gated: true },
        { id: 'ocean-2', name: 'Ocean Boulevard', from: 'junip', to: 'term', area: 1, length: 0.9 },
        { id: 'termino-north', name: 'Termino Avenue', from: 'term', to: 'bh', area: 1, length: 0.8, via: [[945,520]] },
        { id: 'belmont-pier', name: 'Belmont Pier', from: 'term', to: 'pend', area: 1, length: 0.7, via: [[985,620]], turn: true, door: 0.7 },
        { id: 'belmont-pier-back', name: 'Belmont Pier', from: 'pend', to: 'term', area: 1, length: 0.7, via: [[965,625]], back: 'belmont-pier' },
        { id: 'termino-south', name: 'Termino Avenue', from: 'bh', to: 'term', area: 1, length: 0.8, via: [[920,520]] },
        { id: 'fourth-east', name: '4th Street', from: 'bh', to: 'bpark', area: 2, length: 0.9, turn: true },
        { id: 'broadway-return', name: 'Broadway', from: 'bpark', to: 'bw', area: 1, length: 1.6, via: [[600,430]] },
        { id: 'junipero', name: 'Junipero Avenue', from: 'bpark', to: 'junip', area: 2, length: 0.6, turn: true, door: 0.7 },
      ],
      addresses: ['pine', 'belmont-pier', 'junipero'],
      features: [
        { kind: 'water', points: [[0,650],[0,600],[180,612],[340,625],[500,608],[700,612],[900,628],[960,640],[1280,620],[1280,720],[0,720]], name: 'Pacific Ocean' },
        { kind: 'water', points: [[60,80],[85,80],[95,300],[110,500],[130,610],[105,612],[85,500],[70,300]], name: 'Los Angeles River' },
        { kind: 'park', points: [[700,556],[780,556],[780,573],[700,573]], name: 'Bluff Park' },
        { kind: 'park', points: [[430,562],[500,556],[500,588],[430,592]], name: 'Cesar Chavez Park' },
        { kind: 'park', points: [[1010,290],[1160,290],[1160,400],[1010,400]], name: 'Recreation Park' },
      ],
      landmarks: [
        { name: 'Queen Mary', x: 110, y: 640 },
        { name: 'Aquarium of the Pacific', x: 330, y: 615 },
        { name: 'Retro Row', x: 690, y: 425 },
        { name: 'Bluff Park', x: 720, y: 540 },
        { name: 'Naples Island', x: 1130, y: 590 },
      ],
    },
  };

  // A city with a grid is authored in street/avenue steps (a, b) and turned onto the sheet here, so every
  // road sits on its own tilted lattice. Everything downstream just sees sheet coordinates.
  for (const m of Object.values(MAPS)) {
    const g = m.grid;
    if (!g) continue;
    const c = Math.cos(g.rot * Math.PI / 180), s = Math.sin(g.rot * Math.PI / 180);
    const at = (a, b) => [g.ox + a * g.ga * c + b * g.gb * s, g.oy + a * g.ga * s - b * g.gb * c].map(v => Math.round(v * 10) / 10);
    for (const n of Object.values(m.nodes)) [n.x, n.y] = at(n.a, n.b);
    for (const st of m.streets) if (st.via) st.via = st.via.map(p => at(...p));
    for (const f of m.features) f.points = f.points.map(p => at(...p));
    for (const l of m.landmarks) [l.x, l.y] = at(l.a, l.b);
    m.areaLabels = (m.areaLabels || []).map(p => at(...p));
    m.backdrop = (m.backdrop || []).map(([name, a, b, up]) => [name, ...at(a, b), up]);
  }

  // Each city's picture: roads stretched to fill the sheet and pinned to a street grid (a gridded city is
  // already on the sheet). Crossroads never share a grid point; the later one takes the nearest free corner.
  const G = 40, fits = {};
  function fit(id) {
    if (fits[id]) return fits[id];
    const m = MAPS[id];
    if (m.grid) {
      const f = p => p.map(Math.round);
      f.node = n => [m.nodes[n].x, m.nodes[n].y];
      return (fits[id] = f);
    }
    const pts = [...Object.values(m.nodes).map(n => [n.x, n.y]), ...m.streets.flatMap(s => s.via || [])];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const sx = 1130 / (Math.max(...xs) - x0), sy = 540 / (Math.max(...ys) - y0);
    const stretch = ([x, y]) => [75 + (x - x0) * sx, 100 + (y - y0) * sy];
    const snap = ([x, y]) => [Math.round(x / G) * G, Math.round(y / G) * G];
    const taken = new Set(), nodes = {};
    for (const [nid, n] of Object.entries(m.nodes)) {
      const [x, y] = snap(stretch([n.x, n.y]));
      let best = null;
      for (let r = 0; r < 4 && !best; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        const k = `${x + dx * G},${y + dy * G}`;
        if (!taken.has(k) && (!best || Math.hypot(dx, dy) < best[2])) best = [x + dx * G, y + dy * G, Math.hypot(dx, dy), k];
      }
      taken.add(best[3]); nodes[nid] = [best[0], best[1]];
    }
    // Landscape keeps its own shape; only the roads are gridded.
    const f = p => stretch(p).map(Math.round);
    f.node = nid => nodes[nid];
    return (fits[id] = f);
  }

  if (typeof module !== 'undefined') module.exports = { MAPS, fit, G }; else { root.PR_MAPS = MAPS; root.PR_MAPFIT = { fit, G }; }
})(typeof window !== 'undefined' ? window : globalThis);
