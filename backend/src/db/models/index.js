// backend/src/db/models/index.js
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize.js';



export class Region extends Model {}
Region.init(
  {
    name_en: { type: DataTypes.TEXT, allowNull: false },
    name_ru: { type: DataTypes.TEXT, allowNull: false },
    name_hy: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'Region', tableName: 'regions', underscored: true, timestamps: false }
);

export class Town extends Model {}
Town.init(
  {
    name_en: { type: DataTypes.TEXT, allowNull: false },
    name_ru: { type: DataTypes.TEXT, allowNull: false },
    name_hy: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'Town', tableName: 'towns', underscored: true, timestamps: false }
);



export class Property extends Model {}
Property.init(
  {
    title: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    type: DataTypes.TEXT,
    status: DataTypes.TEXT,
    price: DataTypes.DECIMAL(14, 2),
    currency: { type: DataTypes.TEXT, defaultValue: 'USD' },
    beds: DataTypes.INTEGER,
    baths: DataTypes.INTEGER,
    area_sq_m: DataTypes.INTEGER,


    floor: { type: DataTypes.STRING(20) },

    lat: DataTypes.DOUBLE,
    lng: DataTypes.DOUBLE,
    cover_image: DataTypes.TEXT,
  },
  { sequelize, modelName: 'Property', tableName: 'properties', underscored: true, timestamps: false }
);

export class PropertyImage extends Model {}
PropertyImage.init(
  {
    url: { type: DataTypes.TEXT, allowNull: false },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_cover: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, modelName: 'PropertyImage', tableName: 'property_images', underscored: true, timestamps: false }
);

export class Panorama extends Model {}
Panorama.init(
  {
    url: { type: DataTypes.TEXT, allowNull: false },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, modelName: 'Panorama', tableName: 'panoramas', underscored: true, timestamps: false }
);



export class Amenity extends Model {}
Amenity.init(
  {
    code: { type: DataTypes.TEXT, allowNull: false, unique: true },
    name_en: { type: DataTypes.TEXT, allowNull: false },
    name_ru: { type: DataTypes.TEXT, allowNull: false },
    name_hy: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'Amenity', tableName: 'amenities', underscored: true, timestamps: false }
);

export class PropertyAmenity extends Model {}
PropertyAmenity.init(
  {
    property_id: { type: DataTypes.BIGINT, primaryKey: true, allowNull: false },
    amenity_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  },
  {
    sequelize,
    modelName: 'PropertyAmenity',
    tableName: 'property_amenities',
    underscored: true,
    timestamps: false,
    indexes: [{ unique: true, fields: ['property_id', 'amenity_id'] }],
  }
);



export class Customer extends Model {}
Customer.init(
  {
    full_name: { type: DataTypes.TEXT, allowNull: false },
    email: DataTypes.TEXT,
    phone: DataTypes.TEXT,
    note: { type: DataTypes.TEXT, defaultValue: '' },
  },
  { sequelize, modelName: 'Customer', tableName: 'customers', underscored: true, timestamps: false }
);

export class Lead extends Model {}
Lead.init(
  {
    source: DataTypes.TEXT,
    message: { type: DataTypes.TEXT, defaultValue: '' },
    status: { type: DataTypes.TEXT, defaultValue: 'new' },
  },
  { sequelize, modelName: 'Lead', tableName: 'leads', underscored: true, timestamps: false }
);



export class User extends Model {}
User.init(
  {
    name: { type: DataTypes.TEXT, allowNull: false },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(v) {
        this.setDataValue('email', String(v || '').trim().toLowerCase());
      },
    },
    password_hash: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['email'] }],
  }
);




Region.hasMany(Town, { foreignKey: 'region_id' });
Town.belongsTo(Region, { foreignKey: 'region_id' });


Region.hasMany(Property, { foreignKey: 'region_id' });
Town.hasMany(Property, { foreignKey: 'town_id' });
Property.belongsTo(Region, { foreignKey: 'region_id' });
Property.belongsTo(Town, { foreignKey: 'town_id' });


Property.hasMany(PropertyImage, { foreignKey: 'property_id', as: 'images' });
PropertyImage.belongsTo(Property, { foreignKey: 'property_id' });

Property.hasMany(Panorama, { foreignKey: 'property_id', as: 'panoramas' });
Panorama.belongsTo(Property, { foreignKey: 'property_id' });


Property.belongsToMany(Amenity, {
  through: PropertyAmenity,
  foreignKey: 'property_id',
  otherKey: 'amenity_id',
  as: 'amenities',
});
Amenity.belongsToMany(Property, {
  through: PropertyAmenity,
  foreignKey: 'amenity_id',
  otherKey: 'property_id',
  as: 'properties',
});


Customer.hasMany(Lead, { foreignKey: 'customer_id' });
Lead.belongsTo(Customer, { foreignKey: 'customer_id' });
Property.hasMany(Lead, { foreignKey: 'property_id' });
Lead.belongsTo(Property, { foreignKey: 'property_id' });



export function initDb() {

  return sequelize.authenticate();
}

export { sequelize };
export default {
  sequelize,
  Region,
  Town,
  Property,
  PropertyImage,
  Panorama,
  Amenity,
  PropertyAmenity,
  Customer,
  Lead,
  User,
  initDb,
};
