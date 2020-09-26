/******************************
  Variables & Libs
*******************************/

const moment = require("moment");
const config = require('./config').production;
const pool = config.getPool();
var Hashids = require('hashids');

/******************************
  Helper Functions
*******************************/

module.exports = {

  // Print to console with timestamp prefix
  isAdmin: function(member) {
    if (  member.hasPermission('ADMINISTRATOR') ||
          member.hasPermission('MANAGE_CHANNELS') ||
          // member.roles.cache.find(roles => roles.name === "Admin") ||
          Object.keys(config.adminIDs).includes(member.id) )
      return true;
    else
      return false;
  },

  // Print to console with timestamp prefix
  printStatus: function(text) {
    console.log( "[" + moment().format() + "] " + text );
  },

  logCommands: async function(message) {
    let insertId = 0;

    await pool.query("INSERT INTO commands (command, user_id, username, server_id, date_added) VALUES (?, ?, ?, ?, ?)", [message.content, message.author.id, message.author.username, message.guild.id, moment().format('YYYY-M-D HH:mm:ss')])
    .then(function(res){
      if( res.insertId > 0 ) {
        let hashid = new Hashids('ISAC_BOT', 6, 'abcdefghijklmnopqrstuvwxyz'); // pad to length 10
        pool.query("UPDATE commands SET hash = ? WHERE id = ?", [ hashid.encode(res.insertId), res.insertId ]);

        insertId = res.insertId;
      }
    })
    .catch(function(error){
      console.log(error);
      console.log(message);
    });

    return insertId;
  },

  saveLogCommandResult: function(id, data) {
    if(id > 0) {
      data = JSON.stringify(data);
      pool.query("UPDATE commands SET result = ? WHERE id = ?", [data, id]);
    }
  },

}