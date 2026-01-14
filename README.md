# Learning Circle - Classroom Website

A classroom website for teachers, students, and families. Built with simplicity in mind, runs entirely on GitHub Pages with no backend required.

## Features

### Visual Schedule Builder
The main feature is a drag-and-drop visual schedule builder that lets teachers:

- **Build daily schedules** by dragging subject cards onto a timeline
- **Customize timing** with 30-minute default blocks, adjustable in 15-minute increments
- **Auto-merge blocks** - dragging two Math blocks together creates one longer Math block
- **Copy schedules** from previous days (MWF and TTh often have similar flows)
- **Student Display Mode** - large, clean visuals optimized for smartboard viewing
- **Auto-highlight current block** based on real-time clock
- **Export/Import** schedules as JSON for backup or transfer

### Multi-Page Foundation
The site is structured to grow over time:
- **Home** - Welcome page for students and families
- **Schedule** - Visual Schedule Builder (fully functional)
- **Resources** - Coming soon (placeholder)
- **News** - Coming soon (placeholder)

## Quick Start

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Visual_Schedule_Helper-.git
   cd Visual_Schedule_Helper-
   ```

2. Serve the files with any static server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js (npx)
   npx serve

   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

### Deploying with GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to **Pages** in the sidebar
3. Under "Source", select **Deploy from a branch**
4. Choose the `main` branch and `/ (root)` folder
5. Click Save
6. Your site will be live at `https://YOUR_USERNAME.github.io/Visual_Schedule_Helper-/`

## Using the Schedule Builder

### Teacher Mode (schedule.html)

1. **Select a date** using the date picker at the top
2. **Drag cards** from the left sidebar onto the schedule area
3. **Reorder blocks** by dragging them up or down
4. **Adjust times** by:
   - Typing directly in the time inputs
   - Using the +5/-5 and +15/-15 buttons
   - Dragging the bottom resize handle
5. **Edit labels** by clicking on the block name
6. **Add notes** in the optional notes field
7. Changes are **auto-saved** to your browser's localStorage

### Student Display Mode (display.html)

1. Click **"Student View"** button in the schedule builder
2. The schedule displays with large, kid-friendly visuals
3. The **current block** is automatically highlighted based on real time
4. Press **F** for fullscreen (great for smartboards)
5. Press **P** to print the schedule
6. Press **Esc** or click **Edit** to return to teacher mode

### Keyboard Shortcuts (Display Mode)

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen |
| `P` | Print schedule |
| `←` | Previous day |
| `→` | Next day |
| `Esc` | Return to edit mode |

## Adding Custom Visuals

### Adding a New Subject Card

1. Create an SVG or PNG image (recommended: 80x80px)
2. Save it to `assets/visuals/your-subject.svg`
3. Open `data/visuals.json`
4. Add an entry to the `cards` array:

```json
{
  "id": "your-subject",
  "label": "Your Subject",
  "category": "academic",
  "image": "assets/visuals/your-subject.svg",
  "color": "#267340",
  "defaultDuration": 30
}
```

### Available Categories
- `academic` - Core subjects (Math, Science, Social Studies)
- `literacy` - Language arts (Reading, Lexia, Symphony)
- `breaks` - Non-academic (Lunch, Recess, Preferred Activities)
- `specials` - Enrichment (Gym, Art, Music)

### Creating Custom Cards On-the-Fly

Teachers can also create custom cards directly in the app:
1. Click **"Create Custom Card"** in the sidebar
2. Enter a name (e.g., "Assembly", "Field Trip")
3. Choose an icon from the picker (optional)
4. Select a color
5. The card is saved and appears in the sidebar

## Exporting and Importing Schedules

### Export
1. Scroll to the footer on the Schedule page
2. Click **"Export Data"**
3. A JSON file downloads with all your schedules

### Import
1. Click **"Import Data"** in the footer
2. Select a previously exported JSON file
3. All schedules are restored

This is useful for:
- Backing up your schedules
- Moving to a new computer
- Sharing schedule templates with colleagues

## Project Structure

```
Visual_Schedule_Helper-/
├── index.html              # Home page
├── schedule.html           # Schedule builder (teacher mode)
├── display.html            # Student display mode
├── resources.html          # Resources (placeholder)
├── news.html               # News (placeholder)
│
├── styles/
│   ├── variables.css       # Design tokens (colors, fonts, spacing)
│   ├── main.css            # Global styles and components
│   ├── schedule.css        # Schedule builder styles
│   └── display.css         # Student display mode styles
│
├── scripts/
│   ├── main.js             # Navigation, theme, utilities
│   ├── schedule-data.js    # Data model and localStorage
│   ├── schedule-builder.js # Drag-drop UI and editing
│   └── schedule-display.js # Student display mode logic
│
├── assets/
│   └── visuals/            # Subject card images (SVG)
│
├── data/
│   └── visuals.json        # Card definitions and settings
│
└── README.md
```

## Adding New Pages

1. Create a new HTML file (e.g., `photos.html`)
2. Copy the header/footer structure from an existing page
3. Add the navigation link to all pages:
   ```html
   <a href="photos.html" class="nav-link">Photos</a>
   ```
4. Remember to update both desktop nav (`main-nav`) and mobile nav (`mobile-nav`)

## Design System

The site uses a **soft and warm** color palette designed for Grade 3/4 students:

| Color | Variable | Use |
|-------|----------|-----|
| Forest Green | `--color-primary` | Primary actions, active states |
| Sky Blue | `--color-sky-blue` | Literacy subjects, accents |
| Earth Brown | `--color-earth-brown` | Specials, secondary elements |
| Ochre | `--color-ochre` | Breaks, warnings, highlights |
| Muted Green | `--color-muted-green` | Secondary text |

### Typography
- **Display font**: Lexend (headings, buttons)
- **Body font**: Plus Jakarta Sans (body text)

### Accessibility
- Large fonts for kids with vision challenges
- High contrast ratios
- Keyboard navigation support
- Skip links for screen readers
- ARIA labels on interactive elements

## Browser Support

Tested and works on:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Offline Usage

The schedule builder works offline once loaded:
- Schedules are stored in localStorage
- No internet required after initial page load
- Export your data periodically for backup

## License

This project is open source and available for educational use.

---

Built with care for students and teachers.
