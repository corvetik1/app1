const fs = require('fs');
const { parse } = require('csv-parse');
const logger = require('../utils/logger');

async function migrateTable(Model, csvFile) {
  const records = [];
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvFile)) {
      logger.warn(`CSV-файл не найден: ${csvFile}`);
      return resolve();
    }

    fs.createReadStream(csvFile)
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', (row) => records.push(row))
      .on('end', async () => {
        try {
          await Model.bulkCreate(records.map(row => ({
            ...row,
            id: row.id ? parseInt(row.id) : null,
            balance: row.balance ? parseFloat(row.balance) : null,
            limit: row.limit ? parseFloat(row.limit) : null,
            debt: row.debt ? parseFloat(row.debt) : null,
            minPayment: row.minPayment ? parseFloat(row.minPayment) : null,
            monthlyPayment: row.monthlyPayment ? parseFloat(row.monthlyPayment) : null,
            is_paid: row.is_paid ? parseInt(row.is_paid) : 0,
            amount: row.amount ? parseFloat(row.amount) : null,
            total_debt: row.total_debt ? parseFloat(row.total_debt) : null,
            tender_id: row.tender_id ? parseInt(row.tender_id) : null,
            interest_rate: row.interest_rate ? parseFloat(row.interest_rate) : null,
            term: row.term ? parseInt(row.term) : null,
            order: row.order ? parseInt(row.order) : 0,
            transferToAccountId: row.transferToAccountId ? parseInt(row.transferToAccountId) : null,
            visible: row.visible ? parseInt(row.visible) : 1,
          })), { ignoreDuplicates: true });
          logger.info(`Данные из ${csvFile} импортированы`, { recordCount: records.length });
          resolve();
        } catch (error) {
          logger.error(`Ошибка импорта ${csvFile}`, { message: error.message, stack: error.stack });
          reject(error);
        }
      })
      .on('error', reject);
  });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { getModels } = require('../config/sequelize');
    const models = await getModels();

    await migrateTable(models.Account, './accounts.csv');
    await migrateTable(models.Debt, './debts.csv');
    await migrateTable(models.Document, './documents.csv');
    await migrateTable(models.HeaderNote, './header_note.csv');
    await migrateTable(models.Loan, './loans.csv');
    await migrateTable(models.Margin, './margin.csv');
    await migrateTable(models.Report, './reports.csv');
    await migrateTable(models.TenderBudget, './tender_budget.csv');
    await migrateTable(models.Tender, './tenders.csv');
    await migrateTable(models.Transaction, './transactions.csv');
    await migrateTable(models.VisibilitySetting, './visibility_settings.csv');
  },

  down: async (queryInterface, Sequelize) => {
    const { getModels } = require('../config/sequelize');
    const models = await getModels();
    await Promise.all(Object.values(models).map(model => queryInterface.dropTable(model.tableName)));
    logger.info('Все таблицы удалены для отката миграции');
  },
};