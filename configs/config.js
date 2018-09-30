const convict = require('convict')

let config = convict({
  RPC_NODES: {
    doc: 'Array of RPC-Nodes',
    format: '*',
    default: [
      "https://api.steemitstage.com",
      "https://steemd.privex.io",
      "https://gtg.steem.house:8090",
      "https://rpc.buildteam.io",
      "https://steemd.minnowsupportproject.org"
    ],
    arg: "rpc"
  },
  NODES: {
    doc: 'Array of',
    format: '*',
    default: [
      {
        "ID": 1,
        "IP": "12.34.56.78",
        "PORT": 0,
        "SIGNING_KEY": "STM5..",
        "TYPE": "WITNESS"
      }
    ]
  },
  WITNESS: {
    doc: 'Witness Name',
    format: String,
    default: 'witness-name',
    arg: 'witness'
  },
  INTERVAL: {
    doc: 'Interval in minutes',
    format: Number,
    default: 5
  }
})

config.loadFile('./configs/config.json')
config.validate({ allowed: 'strict' })

module.exports = config