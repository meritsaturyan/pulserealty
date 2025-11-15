import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Panorama extends Model {}
  Panorama.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    property_id: { type: DataTypes.BIGINT, allowNull: false },
    url: { type: DataTypes.TEXT, allowNull: false },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    sequelize, modelName: 'Panorama', tableName: 'panoramas', underscored: true, timestamps: false,
  });
  return Panorama;
};
