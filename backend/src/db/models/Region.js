import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Region extends Model {}
  Region.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name_en: { type: DataTypes.TEXT, allowNull: false },
    name_ru: { type: DataTypes.TEXT, allowNull: false },
    name_hy: { type: DataTypes.TEXT, allowNull: false },
  }, {
    sequelize, modelName: 'Region', tableName: 'regions', underscored: true, timestamps: false,
  });
  return Region;
};
