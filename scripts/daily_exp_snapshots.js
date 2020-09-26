/******************************
  Prod / Dev
*******************************/

const config = require('../config').production;

/******************************
  Variables & Libs
*******************************/

const lodash = require('lodash');
const helper = require("../helper.js");
const axios = require('axios');
const pool = config.getPool();
const moment = require("moment");
const useTrackerGG = true;

pool.query("SELECT * FROM users").then(async function(response){
  if( response.length > 0 ) {
    for(var i=0; i<response.length; i++) {
      agent = response[i];

      if( useTrackerGG )
        agent_data = await getPlayerData(agent.uplay_id, agent.platform, agent.agent_name);
      else
        agent_data = await getPlayerData(agent.uplay_id);

      if( lodash.isEmpty(agent_data) == false ) {

        pool.query("INSERT INTO daily_exp_snapshots (uplay_id, clan_exp, pve_exp, dz_exp, date_added) VALUES (?, ?, ?, ?, ?)", [
          agent.uplay_id,
          agent_data.xp_clan,
          agent_data.xp_ow,
          agent_data.xp_dz,
          moment().format('YYYY-M-D HH:mm:ss')
        ]);

        helper.printStatus("Created daily exp record for " + agent_data.name);
        helper.printStatus( i+1 + "/" + response.length );
      }
      else {
        pool.query("DELETE FROM users WHERE id = ?", [agent.id]);
        helper.printStatus("Deleted user id: " + agent.id);
      }
    }
    process.exit();
  }
})

async function getPlayerData(uplay_id, platform='', username='') {
  let playerData = {};

  if( useTrackerGG ) {

    helper.printStatus("API Call @ getPlayerData (TGG): " + config.apiSearchBaseURL_TGG + platform + "/" + username);

    await axios.get(config.apiSearchBaseURL_TGG + platform + "/" + username).then(async function(response){
      if( response.status === 200 ) {
        if( response.data.data.segments.length > 0 ) {

          playerData = {
            name: response.data.data.platformInfo.platformUserIdentifier,
            uplay_id: uplay_id,
            platform: response.data.data.platformInfo.platformSlug,
            specialization: response.data.data.segments[0].stats.specialization.displayValue ? response.data.data.segments[0].stats.specialization.displayValue : '-',
            avatar: response.data.data.platformInfo.avatarUrl,
            gearscore: response.data.data.segments[0].stats.latestGearScore.value,
            ecredits: response.data.data.segments[0].stats.eCreditBalance.value ? response.data.data.segments[0].stats.eCreditBalance.value : 0, // Currency
            commendations: response.data.data.segments[0].stats.commendationScore.value ? response.data.data.segments[0].stats.commendationScore.value : 0,
            xp_clan: response.data.data.segments[0].stats.xPClan.value, // clan xp
            xp_clan_24h: null,
            xp_clan_7d: null,
            xp_clan_30d: null,
            // pve
            level_pve: response.data.data.segments[0].stats.highestPlayerLevel.value,
            kills_npc: response.data.data.segments[0].stats.killsNpc.value,
            timeplayed_pve: response.data.data.segments[0].stats.timePlayedPve.value,
            xp_ow: response.data.data.segments[0].stats.xPPve.value, // pve xp
            xp_ow_24h: null,
            xp_ow_7d: null,
            xp_ow_30d: null,
            kills_pve_hyenas: response.data.data.segments[0].stats.killsFactionBlackbloc.value,
            kills_pve_outcasts: response.data.data.segments[0].stats.killsFactionCultists.value,
            kills_pve_blacktusk: response.data.data.segments[0].stats.killsFactionEndgame.value,
            kills_pve_truesons: response.data.data.segments[0].stats.killsFactionMilitia.value,
            // dz
            level_dz: response.data.data.segments[0].stats.rankDZ.value,
            xp_dz: response.data.data.segments[0].stats.xPDZ.value,
            xp_dz_24h: null,
            xp_dz_7d: null,
            xp_dz_30d: null,
            timeplayed_dz: response.data.data.segments[0].stats.timePlayedDarkZone.value,
            timeplayed_rogue: response.data.data.segments[0].stats.timePlayedRogue.value,
            maxtime_rogue: response.data.data.segments[0].stats.timePlayedRogueLongest.value,
            kills_pvp_dz_rogue: response.data.data.segments[0].stats.roguesKilled.value,
            kills_pve_dz_hyenas: response.data.data.segments[0].stats.killsFactionDzBlackbloc.value,
            kills_pve_dz_outcasts: response.data.data.segments[0].stats.killsFactionDzCultists.value,
            kills_pve_dz_blacktusk: response.data.data.segments[0].stats.killsFactionDzEndgame.value,
            kills_pve_dz_truesons: response.data.data.segments[0].stats.killsFactionDzMilitia.value,
            kills_pvp_dz_total: 0,
            kills_pvp_elitebosses: response.data.data.segments[0].stats.killsRoleDzElite.value,
            kills_pvp_namedbosses: response.data.data.segments[0].stats.killsRoleDzNamed.value,
            // pvp
            xp_pvp: response.data.data.segments[0].stats.xPPvp.value,
            level_pvp: response.data.data.segments[0].stats.latestConflictRank.value ? response.data.data.segments[0].stats.latestConflictRank.value : 0, // pvp but not dark zone, conflict?
            kills_pvp: response.data.data.segments[0].stats.killsPvP.value,
            timeplayed_pvp: response.data.data.segments[0].stats.timePlayedConflict.value, // pvp but not dark zone, conflict?
            // misc acct stats
            timeplayed_total: response.data.data.segments[0].stats.timePlayed.value,
            kills_total: response.data.data.segments[0].stats.killsPvP.value + response.data.data.segments[0].stats.killsNpc.value,
            looted: response.data.data.segments[0].stats.itemsLooted.value,
            headshots: response.data.data.segments[0].stats.headshots.value, // # of headshots
            // kills by source
            kills_bleeding: response.data.data.segments[0].stats.killsBleeding.value,
            kills_shocked: response.data.data.segments[0].stats.killsShocked.value,
            kills_burning: response.data.data.segments[0].stats.killsBurning.value,
            kills_ensnare: response.data.data.segments[0].stats.killsEnsnare.value,
            kills_headshot: response.data.data.segments[0].stats.killsHeadshot.value, // # of headshot kills
            kills_skill: response.data.data.segments[0].stats.killsSkill.value,
            kills_turret: response.data.data.segments[0].stats.headshots.value,
            kills_ensnare: response.data.data.segments[0].stats.killsWeaponMounted.value,
            // weapons kills
            kills_wp_pistol: response.data.data.segments[0].stats.killsWeaponPistol.value,
            kills_wp_grenade: response.data.data.segments[0].stats.killsWeaponGrenade.value,
            kills_wp_smg: response.data.data.segments[0].stats.killsWeaponSubMachinegun.value,
            kills_wp_shotgun: response.data.data.segments[0].stats.killsWeaponShotgun.value,
            kills_wp_rifles: response.data.data.segments[0].stats.killsWeaponRifle.value,
            kills_specialization: response.data.data.segments[0].stats.killsSpecializationSharpshooter.value + response.data.data.segments[0].stats.killsSpecializationSurvivalist.value + response.data.data.segments[0].stats.killsSpecializationDemolitionist.value,
          }
        }
      }
    })
    .catch(function(error){
      console.log(error);
    });
  }

  else {

    helper.printStatus("API Call: " + config.apiPlayerURL + uplay_id);

    await axios.get(config.apiPlayerURL + uplay_id).then(function(response){
      if( response.status === 200 ) {
        if( response.data.playerfound === true ) {

          // Parse extra data
          try {
            extraData = JSON.parse(response.data.extra_data);
          }
          catch(err) {
            extraData = {};
            helper.printStatus("Unable to parse extra data.");
          }

          playerData = {
            name: response.data.name,
            platform: response.data.platform,
            specialization: response.data.specialization ? response.data.specialization : '-',
            avatar: response.data.avatar_146,
            gearscore: response.data.gearscore,
            // lastlogin: response.data.utime, // unix time
            ecredits: response.data.ecredits, // Ingame currency
            commendations: extraData['LatestCommendationScore'] ? extraData['LatestCommendationScore'] : 0,
            xp_clan: response.data.xp_clan,
            // pve
            level_pve: response.data.level_pve,
            kills_npc: response.data.kills_npc,
            timeplayed_pve: response.data.timeplayed_pve,
            xp_ow: response.data.xp_ow,
            kills_pve_hyenas: response.data.kills_pve_hyenas,
            kills_pve_outcasts: response.data.kills_pve_outcasts,
            kills_pve_blacktusk: response.data.kills_pve_blacktusk,
            kills_pve_truesons: response.data.kills_pve_truesons,
            // dz
            level_dz: response.data.level_dz,
            xp_dz: response.data.xp_dz,
            timeplayed_dz: response.data.timeplayed_dz, // dark zone
            timeplayed_rogue: response.data.timeplayed_rogue,
            maxtime_rogue: response.data.maxtime_rogue,
            kills_pvp_dz_rogue: response.data.kills_pvp_dz_rogue,
            kills_pve_dz_hyenas: response.data.kills_pve_dz_hyenas,
            kills_pve_dz_outcasts: response.data.kills_pve_dz_outcasts,
            kills_pve_dz_blacktusk: response.data.kills_pve_dz_blacktusk,
            kills_pve_dz_truesons: response.data.kills_pve_dz_truesons,
            kills_pvp_dz_total: response.data.kills_pvp_dz_total,
            kills_pvp_elitebosses: response.data.kills_pvp_elitebosses,
            kills_pvp_namedbosses: response.data.kills_pvp_namedbosses,
            // pvp
            xp_pvp: response.data.xp_pvp,
            level_pvp: extraData['LatestLevel.rankType.OrganizedPvpXP'] ? extraData['LatestLevel.rankType.OrganizedPvpXP'] : 0, // pvp but not dark zone, conflict?
            kills_pvp: response.data.kills_pvp,
            timeplayed_pvp: response.data.timeplayed_pvp, // pvp but not dark zone, conflict?
            // misc acct stats
            timeplayed_total: response.data.timeplayed_total,
            kills_total: response.data.kills_total,
            looted: response.data.looted,
            headshots: response.data.headshots, // # of headshots
            // kills by source
            kills_bleeding: response.data.kills_bleeding,
            kills_shocked: response.data.kills_shocked,
            kills_burning: response.data.kills_burning,
            kills_ensnare: response.data.kills_ensnare,
            kills_headshot: response.data.kills_headshot, // # of headshot kills
            kills_skill: response.data.kills_skill,
            kills_turret: response.data.kills_turret,
            kills_ensnare: response.data.kills_ensnare,
            // weapons kills
            kills_wp_pistol: response.data.kills_wp_pistol,
            kills_wp_grenade: extraData['weaponNameKills.weaponName.player_grenade_landing'] ? extraData['weaponNameKills.weaponName.player_grenade_landing'] : 0,
            kills_wp_smg: response.data.kills_wp_smg,
            kills_wp_shotgun: response.data.kills_wp_shotgun,
            kills_wp_rifles: response.data.kills_wp_rifles,
            kills_specialization: response.data.kills_specialization,
          }

          //console.log( response.data );
          //console.log( extraData );
        }
      }
    })
    .catch(function(error){
      console.log(error);
    });
  }

  return playerData;
}