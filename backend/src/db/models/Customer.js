import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Customer extends Model {}
  Customer.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    full_name: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.TEXT },
    phone: { type: DataTypes.TEXT },
    note: { type: DataTypes.TEXT, defaultValue: '' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    sequelize, modelName: 'Customer', tableName: 'customers', underscored: true, timestamps: false,
  });
  return Customer;
};
