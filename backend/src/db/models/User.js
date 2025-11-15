// backend/src/db/models/User.js
import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class User extends Model {}

  User.init(
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      email: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
        set(v) { this.setDataValue('email', String(v || '').trim().toLowerCase()); },
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

  return User;
};
