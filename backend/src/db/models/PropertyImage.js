import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class PropertyImage extends Model {}
  PropertyImage.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    property_id: { type: DataTypes.BIGINT, allowNull: false },
    url: { type: DataTypes.TEXT, allowNull: false },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_cover: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    sequelize, modelName: 'PropertyImage', tableName: 'property_images', underscored: true, timestamps: false,
  });
  return PropertyImage;
};
