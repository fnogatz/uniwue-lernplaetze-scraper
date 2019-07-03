var path = require('path')
var fs = require('fs')

var scrapeIt = require('scrape-it')
var mkdirp = require('mkdirp')
var lastLines = require('read-last-lines')
var yyyymmdd = require('yyyy-mm-dd')

var URL = 'https://www2.bibliothek.uni-wuerzburg.de/UB-Infos/standort_auslastung_en.phtml'
var DATADIR = path.join(__dirname, 'data')

var DATE = yyyymmdd()
var OCCUPANCY_REGEX = /^ca\. ([0-9]+) % \(([0-9]+:[0-9]+)\)$/

scrapeIt(URL, {
  items: {
    listItem: '#content table tbody tr',
    data: {
      id: {
        selector: 'td a',
        attr: 'href',
        convert: link => link.replace(/^.*bib=(.*)$/, '$1')
      },
      name: {
        selector: 'td a:first-child',
        convert: text => text.replace(/Room booking system$/, '')
      },
      capacity: {
        selector: 'td li',
        convert: text => text.replace(/^[\s\S]* ([0-9]+) seats[\s\S]*$/, '$1')
      },
      occupancy: {
        selector: 'td span.kreisinfo',
        convert: text => text.replace(OCCUPANCY_REGEX, '$1')
      },
      occupancyTime: {
        selector: 'td span.kreisinfo',
        convert: text => text.replace(OCCUPANCY_REGEX, '$2')
      },
      times: {
        selector: 'td span.info',
        convert: text => text.replace(/^.* ([0-9]+:[0-9]+) .* ([0-9]+:[0-9]+).*$/, '$1 - $2')
      }
    }
  }
}).then(overview => {
  overview.items.forEach(function (item) {
    var dataDir = path.join(DATADIR, item.id)

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

        var data = item.occupancyTime + ',' + item.occupancy + '\n'

        if (lastEntry.split(',')[0] === item.occupancyTime) {
          // no new entry
          return
        }
        if (preLastEntry && preLastEntry.split(',')[0] !== 'closed' && lastEntry.split(',')[0] === 'closed') {
          // delete preLastLine
          return writeNewFile(filename, item)()
        }

        fs.appendFile(filename, data, function (err) {
          if (err) throw err
        })
      }).catch(writeNewFile(filename, item))
    })
  })
})

function writeNewFile (filename, item) {
  return function () {
    var data = []
    // file does not exist
    // add file header first
    data.push('# ' + item.id + ' - ' + item.name + ' (' + item.capacity + ')')
    data.push('# ' + item.times)
    data.push(item.occupancyTime + ',' + item.occupancy)

    fs.writeFile(filename, data.join('\n') + '\n', function (err) {
      if (err) throw err
    })
  }
}
