# UniWue Lernplatz Scraper

node.js script to save the occupancy rates of study and working spaces in the libraries of the University of Würzburg, Germany.

The rates are collected from the university's official [online overview](https://www2.bibliothek.uni-wuerzburg.de/UB-Infos/standort_auslastung_en.phtml). The script generates CSV files as `/data/<library-id>/<date>.csv`. It is of the following form:

```
# <library-id> - <library-name> (<library-capacity>)
# <opens-at> - <closes-at>
<time>,<occupancy-rate>
```

The first time the CSV is created, the meta data is generated as comments. All following data entries of the form `<time>,<occupancy-rate>` are added at the end. The `<time>` is of the format `HH:MM`, the `<occupancy-rate>` is saved as a percentage. The university currently returns one of `10`, `20`, ..., `100`. The data are updated irregularly, so the script stores a new value only after updates.

The script is intended to be used in a cronjob. Since the meta-data provided by the [online overview](https://www2.bibliothek.uni-wuerzburg.de/UB-Infos/standort_auslastung_en.phtml) is not updated exactly at midnight, we suggest using the following crontab entry:

```crontab
* 6-23 * * * node index.js
```

There is currently not a single library which is longer open than midnight.

## Public Archive

This script has been used since September 2017. A public archive of all records since then can be downloaded from [https://nogatz.net/uniwue-library.tar.gz](https://nogatz.net/uniwue-library.tar.gz).
