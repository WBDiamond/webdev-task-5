/* eslint-disable newline-per-chained-call */
'use strict';

const uuid = require('uuid/v4');

module.exports = class Queries {
    constructor(mongoose, { souvenirsCollection, cartsCollection }) {


        const souvenirSchema = mongoose.Schema({ // eslint-disable-line new-cap
            // Ваша схема сувенира тут
            tags: [String],
            reviews: [{
                _id: false,
                id: String,
                login: String,
                date: Date,
                text: String,
                rating: Number,
                isApproved: Boolean
            }],
            name: String,
            image: String,
            price: Number,
            amount: Number,
            country: String,
            rating: Number,
            isRecent: Boolean
        });

        souvenirSchema.index({ country: 1, rating: 1, price: 1 });

        const cartSchema = mongoose.Schema({ // eslint-disable-line new-cap
            // Ваша схема корзины тут
            items: [{
                souvenirId: mongoose.Schema.ObjectId,
                amount: Number
            }],
            login: { type: String, unique: true, dropDups: true }
        });

        // Модели в таком формате нужны для корректного запуска тестов
        this._Souvenir = mongoose.model('Souvenir', souvenirSchema, souvenirsCollection);
        this._Cart = mongoose.model('Cart', cartSchema, cartsCollection);
    }

    // Далее идут методы, которые вам необходимо реализовать:

    getAllSouvenirs() {
        // Данный метод должен возвращать все сувениры
        return this._Souvenir.find({});
    }

    getCheapSouvenirs(price) {
        // Данный метод должен возвращать все сувениры, цена которых меньше или равна price
        return this._Souvenir.where('price').lte(price);
    }

    getTopRatingSouvenirs(n) {
        // Данный метод должен возвращать топ n сувениров с самым большим рейтингом
        return this._Souvenir.find({}).sort('-rating').limit(n);
    }

    getSouvenirsByTag(tag) {
        // Данный метод должен возвращать все сувениры, в тегах которых есть tag
        // Кроме того, в ответе должны быть только поля name, image и price

        return this._Souvenir.find({ tags: tag }).select({ name: 1, image: 1, price: 1, _id: 0 });
    }

    getSouvenrisCount({ country, rating, price }) {
        // Данный метод должен возвращать количество сувениров,
        // из страны country, с рейтингом больше или равной rating,
        // и ценой меньше или равной price

        // ! Важно, чтобы метод работал очень быстро,
        // поэтому учтите это при определении схем

        return this._Souvenir.where('country', country)
            .where('rating').gte(rating)
            .where('price').lte(price)
            .count();
    }

    searchSouvenirs(substring) {
        // Данный метод должен возвращать все сувениры, в название которых входит
        // подстрока substring. Поиск должен быть регистронезависимым

        return this._Souvenir.where({ 'name': { $regex: new RegExp(substring, 'i') } });
    }

    getDisscusedSouvenirs(date) {
        // Данный метод должен возвращать все сувениры,
        // первый отзыв на которые был оставлен не раньше даты date

        return this._Souvenir.where('reviews.0.date').gt(date);
    }

    deleteOutOfStockSouvenirs() {
        // Данный метод должен удалять все сувениры, которых нет в наличии
        // (то есть amount = 0)

        // Метод должен возвращать объект формата { ok: 1, n: количество удаленных сувениров }
        // в случае успешного удаления

        return this._Souvenir.remove({ amount: 0 });
    }

    async addReview(souvenirId, { login, rating, text }) {
        // Данный метод должен добавлять отзыв к сувениру souvenirId, отзыв добавляется
        // в конец массива (чтобы сохранить упорядоченность по дате),
        // содержит login, rating, text - из аргументов,
        // date - текущая дата и isApproved - false
        // Обратите внимание, что при добавлении отзыва рейтинг сувенира должен быть пересчитан

        return this._Souvenir.findById(souvenirId)
            .then((souvenir) => {
                let sum = rating;
                souvenir.reviews.forEach((review) => {
                    sum += review.rating;
                });

                souvenir.rating = sum / (souvenir.reviews.length + 1);
                souvenir.reviews.push({
                    id: uuid(),
                    login,
                    date: Date.now(),
                    text,
                    rating,
                    isApproved: false
                });

                souvenir.save();
            });
    }

    async getCartSum(login) {
        // Данный метод должен считать общую стоимость корзины пользователя login
        // У пользователя может быть только одна корзина, поэтому это тоже можно отразить
        // в схеме

        const person = await this._Cart.findOne({ 'login': login });
        let cartCost = 0;

        for (let i = 0; i < person.items.length; i++) {
            const souvenir = await this._Souvenir.findById(person.items[i].souvenirId);
            cartCost += souvenir.price * person.items[i].amount;
        }

        return cartCost;
    }
};
