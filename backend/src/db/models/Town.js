import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Town extends Model {}
  Town.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    region_id: { type: DataTypes.INTEGER, allowNull: false },
    name_en: { type: DataTypes.TEXT, allowNull: false },
    name_ru: { type: DataTypes.TEXT, allowNull: false },
    name_hy: { type: DataTypes.TEXT, allowNull: false },
  }, {
    sequelize, modelName: 'Town', tableName: 'towns', underscored: true, timestamps: false,
  });
  return Town;
};
