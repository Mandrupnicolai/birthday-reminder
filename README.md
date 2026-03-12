# Birthday Reminder

A lightweight, no-build birthday reminder web app. Add names and dates, see upcoming birthdays sorted by soonest, and keep your data in localStorage.

## Features
- Add birthdays (name + date)
- Upcoming list sorted by soonest
- Age calculation ("Turns X")
- Inline editing
- JSON import/export
- CSV import/export (supports `name,date` and `name,month,day,year`)
- Deduping on import with a toast for skipped duplicates
- Page-load notifications with configurable window (7/14/30 days)

## Run
Open `index.html` in a browser.

## CSV Formats

### `name,date`
```
name,date
Alex,1992-06-12
```

### `name,month,day,year`
```
name,month,day,year
Alex,6,12,1992
```

## Notes
- Notifications require browser permission.
- Data is stored locally in your browser.
