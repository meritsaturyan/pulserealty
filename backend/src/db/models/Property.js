// backend/src/db/models/Property.js
import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Property extends Model {}

  Property.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      title: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { len: [2, 300] },
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      },

      type: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'Apartment',
      },

      status: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'for_sale',
      },

      price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },

      currency: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'USD',
      },

      beds: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      baths: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      area_sq_m: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ЭТАЖ как текст, чтобы можно было хранить "4/16"
      floor: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      lat: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },

      lng: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },

      region_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      town_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      cover_image: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '',
      },
    },
    {
      sequelize,
      modelName: 'Property',
      tableName: 'properties',
      underscored: true,

      timestamps: true,

      indexes: [
        { fields: ['status'] },
        { fields: ['type'] },
        { fields: ['region_id'] },
        { fields: ['town_id'] },
        { fields: ['price'] },
      ],

      defaultScope: {
        order: [['id', 'DESC']],
      },
    }
  );

  return Property;
};
