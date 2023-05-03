'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Sport.hasMany(models.SportSession,{
        foreignKey: "sportId"
      })
    }

    static async addSport({SportName,sportSessionId}){
      return this.create({SportName:SportName,sportSessionId});
    }

    static async getSportName(){
      return this.findAll();
    }

    static async perticulerSport(id){
      return this.findByPk(id);
    }

    static async remove(id){
      return this.destroy({where:{
        id,
      }});
    }
  }
  Sport.init({
    SportName: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Sport',
  });
  return Sport;
};