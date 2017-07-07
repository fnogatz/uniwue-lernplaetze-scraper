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
        convert: link => {
          if (link === 'http://www.bibliothek.uni-wuerzburg.de/ub_infos/oeffnungszeiten/') {
            return '000'
          }

          return link.replace(/^.*=([0-9]+)$/, '$1')
        }
      },
      name: {
        selector: '.tcell-m a'
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

      lastLine(filename).then(lastEntry => {
        getOccupancy(occupancyUrl).then(function (occupancy) {
          if (lastEntry.split(',')[0] === occupancy.time) {
            // no new entry
            return
          }

          var data = occupancy.time + ',' + occupancy.percentage + '\n'
          fs.appendFile(filename, data, function (err) {
            if (err) throw err
          })
        })
      }).catch(function () {
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

          return getOccupancy(occupancyUrl)
        }).then(function (occupancy) {
          data.push(occupancy.time + ',' + occupancy.percentage)
          fs.appendFile(filename, data.join('\n') + '\n', function (err) {
            if (err) throw err
          })
        })
      })
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

function lastLine (filename) {
  return lastLines.read(filename, 1)
}
