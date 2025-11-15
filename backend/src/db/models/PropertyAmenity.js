// backend/src/db/models/PropertyAmenity.js
import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class PropertyAmenity extends Model {}

  PropertyAmenity.init(
    {
      property_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amenity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'amenities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'PropertyAmenity',
      tableName: 'property_amenities',
      underscored: true,
      timestamps: false,
      indexes: [
        { unique: true, fields: ['property_id', 'amenity_id'] },
        { fields: ['amenity_id'] },
      ],
    }
  );

  return PropertyAmenity;
};
