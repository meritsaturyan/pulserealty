import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class Lead extends Model {}
  Lead.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    property_id: { type: DataTypes.BIGINT, allowNull: true },
    customer_id: { type: DataTypes.BIGINT, allowNull: true },
    source: { type: DataTypes.TEXT },
    message: { type: DataTypes.TEXT, defaultValue: '' }, // JSON-строка с доп.данными
    status: { type: DataTypes.TEXT, defaultValue: 'new' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    sequelize, modelName: 'Lead', tableName: 'leads', underscored: true, timestamps: false,
  });
  return Lead;
};
