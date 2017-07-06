# UniWue Lernplatz Scraper

node.js script to save the occupancy rates of study and working spaces in the libraries of the University of Würzburg, Germany.

The rates are collected from the university's official [online overview](https://www2.bibliothek.uni-wuerzburg.de/UB-Infos/standort_auslastung_en.phtml). The script generates CSV files as `/data/<library-id>/<date>.csv`. It is of the following form:

```
# <library-id> - <library-name> (<library-capacity>)
# <opens-at> - <closes-at>
<time>,<occupancy-rate>
```

The first time the CSV is created, the meta data is generated as comments. All following data entries of the form `<time>,<occupancy-rate>` are added at the end. The `<time>` is of the format `HH:MM`, the `<occupancy-rate>` is saved as a percentage. The university currently returns one of `10`, `20`, ..., `100`. The data are updated irregularly, so the script stores a new value only after updates. It is intended to be used in a cronjob.
