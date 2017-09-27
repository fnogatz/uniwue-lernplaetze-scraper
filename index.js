var path = require('path')
var fs = require('fs')
var Url = require('url').URL

var scrapeIt = require('scrape-it')
var mkdirp = require('mkdirp')
var lastLines = require('read-last-lines')

var URL = 'https://www2.bibliothek.uni-wuerzburg.de/UB-Infos/standort_auslastung_en.phtml'
var URLBASE = new Url(URL).origin
var DATADIR = path.join(__dirname, 'data')

var dateParts = new Date().toLocaleString('de', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Berlin' }).split('/')
var DATE = dateParts[2] + '-' + dateParts[0] + '-' + dateParts[1]

scrapeIt(URL, {
  items: {
    listItem: '.table .trow',
    data: {
      id: {
        selector: '.tcell-m a',
        attr: 'href',
        convert: link => link.replace(/^.*bib=(.*)$/, '$1')
      },
      name: {
        selector: '.tcell-m a',
        convert: text => text.replace(/Room booking system$/, '')
      },
      capacity: {
        selector: '.tcell-m li',
        convert: text => text.replace(/^[\s\S]* ([0-9]+) seats[\s\S]*$/, '$1')
      },
      occupancyLink: {
        selector: '.tcell-l iframe',
        attr: 'src'
      },
      openingTimesLink: {
        selector: '.tcell-m iframe',
        attr: 'src'
      }
    }
  }
}).then(overview => {
  overview.items.forEach(function (item) {
    var dataDir = path.join(DATADIR, item.id)
    var occupancyUrl = URLBASE + item.occupancyLink

    mkdirp(dataDir, function (err) {
      if (err) {
        throw err
      }

      var filename = path.join(dataDir, DATE + '.csv')

      lastLines.read(filename, 2).then(lines => {
        lines = lines.split('\n')

        var preLastEntry = false
        if (lines[0][0] !== '#') {
          preLastEntry = lines[0]
        }

        var lastEntry = lines[1]

        getOccupancy(occupancyUrl).then(function (occupancy) {
          var data = occupancy.time + ',' + occupancy.percentage + '\n'

          if (lastEntry.split(',')[0] === occupancy.time) {
            // no new entry
            return
          }
          if (preLastEntry && preLastEntry.split(',')[0] !== 'closed' && lastEntry.split(',')[0] === 'closed') {
            // delete preLastLine
            return writeNewFile(filename, item, occupancy)()
          }

          fs.appendFile(filename, data, function (err) {
            if (err) throw err
          })
        })
      }).catch(writeNewFile(filename, item, occupancyUrl))
    })
  })
})

function getOccupancy (url) {
  return scrapeIt(url, {
    percentage: {
      selector: 'span.info',
      convert: text => text.replace(/^.* ([0-9]+) %.*$/, '$1')
    },
    time: {
      selector: 'span.info',
      convert: text => text.replace(/^.*\(([0-9]+:[0-9]+)\).*$/, '$1')
    }
  })
}

function writeNewFile (filename, item, occupancyUrl) {
  return function () {
    var data = []
    // file does not exist
    // add file header first
    data.push('# ' + item.id + ' - ' + item.name + ' (' + item.capacity + ')')

    var openingTimesUrl = URLBASE + item.openingTimesLink

    scrapeIt(openingTimesUrl, {
      times: {
        selector: 'span',
        convert: text => text.replace(/^.* ([0-9]+:[0-9]+) .* ([0-9]+:[0-9]+).*$/, '$1 - $2')
      }
    }).then(open => {
      data.push('# ' + open.times)

      if (typeof occupancyUrl === 'object') {
        return Promise.resolve(occupancyUrl)
      }

      return getOccupancy(occupancyUrl)
    }).then(function (occupancy) {
      data.push(occupancy.time + ',' + occupancy.percentage)
      fs.writeFile(filename, data.join('\n') + '\n', function (err) {
        if (err) throw err
      })
    })
  }
}
