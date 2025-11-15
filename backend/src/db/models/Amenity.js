import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Amenity extends Model {}
  Amenity.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.TEXT, unique: true, allowNull: false },
    name_en: { type: DataTypes.TEXT, allowNull: false },
    name_ru: { type: DataTypes.TEXT, allowNull: false },
    name_hy: { type: DataTypes.TEXT, allowNull: false },
  }, {
    sequelize, modelName: 'Amenity', tableName: 'amenities', underscored: true, timestamps: false,
  });
  return Amenity;
};
