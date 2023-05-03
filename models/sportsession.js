'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SportSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SportSession.belongsTo(models.Sport,{
        foreignKey: "sportId"
      })
    }
    static addSession({ date,time,place, player, TotalPlayer, sportId }) {
      return this.create({  date,time,place, player, TotalPlayer, sportId });
    }

    static async getSessionDetail(sportId){
      return this.findAll({where:{
        sportId,
      }})
    }

    static async remove(id){
      return this.destroy({where:{
        id,
      }});
    }
   
    static async updatePlayer({player,id}){
      return this.update({player:player},{where:{
        id,
      }})
    }
  }
  SportSession.init({
    date: DataTypes.DATEONLY,
    time: DataTypes.STRING,
    place: DataTypes.STRING,
    player: DataTypes.STRING,
    TotalPlayer: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SportSession',
  });
  return SportSession;
};