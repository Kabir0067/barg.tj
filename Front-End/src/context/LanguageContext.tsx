"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'tj' | 'ru';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  tj: {
    // Navbar
    nav_products: 'Маҳсулот',
    nav_admin: 'Панели Админ',
    nav_login: 'Ворид шудан',
    nav_logout: 'Баромад',
    
    // Home
    home_badge: 'Мағозаи сохтмонии деҳаи шумо',
    home_title_1: 'Тамоми маводҳои сохтмонӣ',
    home_title_2: 'дар як ҷо бо нархи дастрас',
    home_desc: 'Барои харид кардан сабтином шарт нест. Мо маҳсулотро бо нархи арзон ва дар муддати кӯтоҳ мустақиман ба хонаатон мерасонем.',
    home_btn_explore: 'Дидани маҳсулот',
    home_feat_1_title: 'Расонидани зуд',
    home_feat_1_desc: 'Агар маблағи харид аз 5000 сомонӣ зиёд бошад, расонидан тамоман ройгон аст.',
    home_feat_2_title: 'Кафолати сифат',
    home_feat_2_desc: 'Мо танҳо бо маҳсулоти босифат ва корхонаҳои боэътимод кор мекунем.',
    home_feat_3_title: 'Харид бе ташвиш',
    home_feat_3_desc: 'Ҳеҷ гуна сабтиноми мураккаб лозим нест, танҳо рақами телефон ва нишонии шумо кифоя аст.',
    home_categories: 'Категорияҳои маҳсулот',
    home_featured: 'Маҳсулоти пешниҳодшуда',
    home_view_all: 'Дидани ҳама',

    // Login/Register
    login_tab: 'Ворид шудан',
    register_tab: 'Сабтином',
    login_welcome: 'Хуш омадед ба Barg.tj!',
    register_welcome: 'Сохтани ҳисоби нав',
    login_desc: 'Рақами телефон ва паролатонро ворид кунед, то ба ҳисоби худ дароед.',
    register_desc: 'Ном, рақами телефон ва парол интихоб кунед, то ҳисоби бехатари шахсӣ созед.',
    field_phone: 'Рақами телефон',
    field_name: 'Номи шумо',
    field_name_placeholder: 'Масалан: Сомон',
    field_password: 'Парол',
    field_password_placeholder: 'Камаш 6 ҳарф',
    field_password_confirm: 'Такрори парол',
    field_password_confirm_placeholder: 'Паролро дубора нависед',
    btn_login: 'Ворид шудан',
    btn_register: 'Сабтином шудан',
    no_account: 'Ҳисоб надоред?',
    have_account: 'Аллакай ҳисоб доред?',
    switch_to_register: 'Сабтином кунед',
    switch_to_login: 'Ворид шавед',
    err_phone_length: 'Рақами телефонро пурра ворид кунед',
    err_password_short: 'Парол бояд камаш 6 ҳарф бошад',
    err_password_mismatch: 'Паролҳо мувофиқат намекунанд',
    err_login: 'Рақами телефон ё парол нодуруст аст.',
    msg_success_login: 'Хуш омадед!',
    msg_success_register: 'Ҳисоби шумо бомуваффақият сохта шуд!',

    // Cart
    cart_title: 'Сабади харид',
    cart_empty: 'Сабади харид холӣ аст',
    cart_empty_desc: 'Шумо ҳанӯз ягон маҳсулот интихоб накардаед. Биёед якҷоя интихоб кунем!',
    cart_total: 'Ҳамагӣ:',
    cart_free_ship: 'Расонидани ройгон фаъол шуд!',
    cart_btn_checkout: 'Идома додани фармоиш',
    cart_btn_back: 'Бозгашт ба сабад',
    
    // Checkout Form
    checkout_title: 'Маълумот барои расонидан',
    checkout_desc: 'Лутфан нишонии дақиқи худро нависед, то молро бе хато ба хонаатон орем.',
    checkout_village: 'Номи деҳа (ё шаҳр)',
    checkout_village_placeholder: 'Масалан: деҳаи Сомониён',
    checkout_landmark: 'Нишонаи кӯча, рақами хона ё наздикии ягон ҷо',
    checkout_landmark_placeholder: 'Масалан: кӯчаи Баҳор, хонаи 12, назди мактаб',
    checkout_notes: 'Эзоҳи иловагӣ',
    checkout_notes_placeholder: 'Агар ягон хоҳиши махсус дошта бошед, инҷо нависед',
    checkout_error: 'Лутфан ном, телефон ва деҳаро пурра нависед',
    checkout_payment: 'Тарзи пардохт',
    pay_cash: 'Нақдӣ ҳангоми расондан',
    pay_card: 'Корти бонкӣ (Алиф/ДС)',
    pay_terminal: 'Тавассути терминал',
    checkout_btn_submit: 'Фармоишро тасдиқ кунед',
    
    // Order Done
    done_title: 'Фармоиши шумо қабул шуд!',
    done_num: 'Рақами фармоиш:',
    done_desc: 'Мо ба зудӣ бо шумо тамос мегирем, то тафсилоти расониданро аниқ кунем. Ташаккур барои харид!',
    done_btn_continue: 'Бозгашт ба мағоза',

    // Products Catalog
    prod_title: 'Ҳар чизи лозима барои хонаи шумо',
    prod_desc: 'Аз сементу хишт то дигар маҳсулот — мавоҳои босифатро бо нархи дастрас харидори кунед, мо зуд ва бо эҳтиёт то хонаатон мерасонем.',
    prod_hero_badge: '✦ Сифати кафолатнок ва нархи арзон',
    prod_hero_delivery: 'Расонидан ройгон аз 5000 сомонӣ',
    prod_hero_quality: 'Сифати кафолатнок',
    prod_hero_count: 'намуди мол',
    prod_loading: 'Маҳсулот боргирӣ шуда истодааст...',
    prod_not_found: 'Маҳсулот ёфт нашуд',
    prod_no_img: 'Расм надорад',
    prod_btn_add: 'Ба сабад',
    prod_unit_piece: 'дона',
    prod_admin_add: 'Маҳсулоти нав',
    prod_admin_edit: 'Таҳрири маҳсулот',
    prod_admin_delete_confirm: 'Мехоҳед ин маҳсулотро нест кунед?',
    
    // Product Detail
    detail_back: 'Бозгашт ба рӯйхат',
    detail_instock: 'Дар анбор мавҷуд аст:',
    detail_outstock: 'Ҳоло дар анбор нест',
    detail_added: 'Ба сабад илова шуд!',

    // AI Advisor Widget
    ai_title: 'Мушовири мағоза (ИИ)',
    ai_status: 'Дар шабака (Онлайн)',
    ai_greeting: 'Салом! Ман Мушовири Barg.tj ҳастам. Саволи худро дар бораи маҳсулот ё системаамон фаҳмонед. Ман кӯмак мекунам!',
    ai_placeholder: 'Саволи худро бинависед...',
    ai_typing: 'Дар ҳоли фикр кардан ва ҷустуҷӯ...',
    ai_error: 'Мутаассифона, ҳоло бо шабака пайваст шуда натавонистам. Лутфан каме дертар бинависед.',

    // Admin Panel
    admin_title: 'Панели Роҳбар (CRM & ERP)',
    admin_nav_dashboard: 'Аналитика',
    admin_nav_products: 'Маҳсулот',
    admin_nav_ai: 'Таҳлилгари ИИ',
    admin_nav_logout: 'Баромадан',
    admin_nav_admin_role: 'Администратор',
    admin_loading: 'Дар ҳоли боргирӣ...',
    admin_error: 'Хатогӣ ҳангоми боргирии омор.',
    admin_net_profit_today: 'Фоидаи Соф (Имрӯз)',
    admin_revenue_today: 'Даромад / Выручка (Имрӯз)',
    admin_orders_today: 'Фармоишҳои Нав (Имрӯз)',
    admin_low_stock: 'Молҳои Каммонда',
    admin_growth_compare: 'Муқоиса бо дирӯз',
    admin_out_of_stock: 'Анбор комилан холӣ',
    admin_capital_title: 'Таҳлили Сармоя ва Анбор',
    admin_wholesale_value: 'Сармоя дар анбор (Себестоимость)',
    admin_retail_value: 'Арзиши фурӯши анбор (Retail Value)',
    admin_potential_profit: 'Фоидаи эҳтимолии анбор',
    admin_restock_budget: 'Буҷет барои харид (Пурракунӣ)',
    admin_summary_30: 'Хулосаи 30 Рӯзи Охир',
    admin_total_revenue: 'Даромади умумӣ',
    admin_average_order: 'Миёнаи 1 харид (AOV)',
    admin_orders_count: 'Шумораи фармоишҳо',
    admin_margin: 'Рентабелнокии тиҷорат',
    admin_conversion: 'Фоизи иҷрои заказҳо',
    admin_order_status_title: 'Ҳолати Фармоишҳо',
    admin_status_new: 'Нав',
    admin_status_accepted: 'Қабулшуда',
    admin_status_delivering: 'Дар роҳ',
    admin_status_completed: 'Расонидашуда',
    admin_status_cancelled: 'Бекоршуда',

    // Analytics charts & reports
    admin_range_7: '7 рӯз',
    admin_range_30: '30 рӯз',
    admin_range_90: '90 рӯз',
    admin_export_csv: 'Боргирии ҳисобот (CSV)',
    admin_chart_revenue_title: 'Динамикаи Даромад ва Фоидаи Соф',
    admin_chart_revenue_sub: 'Маълумот танҳо аз заказҳои анҷомёфта (Супоридашуда)',
    admin_revenue: 'Даромад',
    admin_profit: 'Фоидаи соф',
    admin_top_products_title: 'Топ Маҳсулот аз рӯи Фоида',
    admin_category_title: 'Даромад аз рӯи Категория',
    admin_top_customers_title: 'Беҳтарин Харидорон (VIP)',
    admin_no_data: 'Ҳоло барои ин давра маълумот нест',
    admin_sold_word: 'фурӯхта шуд',
    admin_orders_word: 'заказ',
    admin_customers_total: 'Шумораи муштариён',
    admin_donut_center: 'Даромад',
    admin_ai_title: 'Таҳлилгари Тиҷоратӣ (ИИ)',
    admin_ai_subtitle: 'Бо маълумоти зиндаи анбор ва молияи худ суҳбат кунед',
    admin_ai_placeholder: 'Савол диҳед (мас: Кадом маҳсулот бештар фоида оварда истодааст?)',
    admin_ai_greeting: 'Салом! Ман таҳлилгари тиҷоратии шумо ҳастам. Ман метавонам ҳисоботи фурӯш, даромад, фоидаи соф ва ҳолати анборро таҳлил кунам. Чӣ гуна ҳисобот ба шумо лозим аст?',
    admin_ai_typing: 'Таҳлил карда истодааст...',
    admin_ai_send: 'Ирсол',
    admin_prod_title: 'Идоракунии Маҳсулот',
    admin_prod_add_btn: 'Иловаи маҳсулот',
    admin_prod_table_img: 'Расм',
    admin_prod_table_name: 'Ном (Тоҷ)',
    admin_prod_table_sku: 'Артикул',
    admin_prod_table_price: 'Нархи фурӯш',
    admin_prod_table_cost: 'Арзиши аслӣ',
    admin_prod_table_stock: 'Захира',
    admin_prod_table_actions: 'Амалҳо',
    admin_confirm_delete: 'Оё шумо мутмаин ҳастед, ки ин маҳсулотро нест кардан мехоҳед?',
    admin_err_delete: 'Хатогӣ ҳангоми нест кардан!',
    admin_err_save: 'Хатогӣ ҳангоми сабт.',
    admin_prod_modal_edit: 'Таҳрири маҳсулот',
    admin_prod_modal_new: 'Маҳсулоти нав',
    admin_form_category: 'Категория *',
    admin_form_name_tj: 'Номи маҳсулот (Тоҷ) *',
    admin_form_name_ru: 'Номи маҳсулот (Рус) *',
    admin_form_sku: 'Артикул (SKU) *',
    admin_form_unit: 'Воҳиди ченак *',
    admin_form_price: 'Нархи фурӯш (TJS) *',
    admin_form_cost: 'Арзиши аслӣ (Себестоимость)',
    admin_form_stock: 'Миқдор дар анбор *',
    admin_form_desc: 'Тавсиф',
    admin_btn_cancel: 'Бекор кардан',
    admin_btn_submit: 'Илова кардан',
    admin_btn_save_changes: 'Сабти тағйирот',
    admin_form_image: 'Расми маҳсулот',
    admin_form_image_hint: 'Расмро интихоб кунед (JPG/PNG)',

    // Admin Orders
    admin_nav_orders: 'Заказҳо',
    ord_title: 'Идоракунии Заказҳо',
    ord_subtitle: 'Заказҳои нав инҷо ва дар гурӯҳи Telegram пайдо мешаванд',
    ord_filter_all: 'Ҳама',
    ord_empty: 'Ҳоло заказе нест',
    ord_customer: 'Муштарӣ',
    ord_address: 'Адрес',
    ord_items: 'Молҳо',
    ord_total: 'Ҷамъ',
    ord_payment: 'Пардохт',
    ord_courier: 'Курьер',
    ord_assign_courier: 'Таъини курьер',
    ord_no_courier: 'Таъин нашуда',
    ord_created: 'Вақт',
    ord_mark_accepted: 'Қабул кардан',
    ord_mark_delivering: 'Ба роҳ баровардан',
    ord_mark_completed: 'Анҷом додан',
    ord_mark_cancelled: 'Бекор кардан',
    ord_confirm_cancel: 'Дар ҳақиқат ин заказро бекор мекунед? Молҳо ба анбор бармегарданд.',

    // Admin Manual Sale (POS)
    admin_nav_sale: 'Фурӯши дастӣ',
    sale_title: 'Фурӯши дастӣ дар мағоза',
    sale_subtitle: 'Молро дар касса фурӯхтед? Инҷо қайд кунед — захира худкор кам мешавад.',
    sale_search: 'Ҷустуҷӯи мол бо ном ё артикул...',
    sale_no_results: 'Чизе ёфт нашуд',
    sale_cart_title: 'Сабади фурӯш',
    sale_cart_empty: 'Сабад холӣ аст. Аз рӯйхат мол интихоб кунед.',
    sale_qty: 'Миқдор',
    sale_total: 'Ҷамъи фурӯш',
    sale_customer: 'Номи муштарӣ (ихтиёрӣ)',
    sale_phone: 'Телефон (ихтиёрӣ)',
    sale_confirm: 'Фурӯшро тасдиқ кунед',
    sale_success: 'Фурӯш сабт шуд! Захира навсозӣ шуд.',
    sale_out: 'Тамом шуд',
    sale_clear: 'Тоза кардан',
    sale_in_stock: 'Дар анбор'
  },
  ru: {
    // Navbar
    nav_products: 'Продукты',
    nav_admin: 'Панель Админа',
    nav_login: 'Войти',
    nav_logout: 'Выйти',

    // Home
    home_badge: 'Ваш сельский строительный магазин',
    home_title_1: 'Все строительные материалы',
    home_title_2: 'в одном месте по доступным ценам',
    home_desc: 'Для покупки не нужна регистрация. Мы быстро доставим выбранные товары прямо к вашему дому.',
    home_btn_explore: 'Смотреть каталог',
    home_feat_1_title: 'Быстрая доставка',
    home_feat_1_desc: 'При заказе товаров на сумму от 5000 сомони доставка абсолютно бесплатна.',
    home_feat_2_title: 'Гарантия качества',
    home_feat_2_desc: 'Мы работаем только с качественными товарами и надежными поставщиками.',
    home_feat_3_title: 'Покупки без забот',
    home_feat_3_desc: 'Никаких сложных регистраций, достаточно указать лишь имя и номер телефона.',
    home_categories: 'Категории товаров',
    home_featured: 'Рекомендуемые товары',
    home_view_all: 'Показать все',

    // Login/Register
    login_tab: 'Войти',
    register_tab: 'Регистрация',
    login_welcome: 'Добро пожаловать в Barg.tj!',
    register_welcome: 'Создать новый аккаунт',
    login_desc: 'Введите номер телефона и пароль, чтобы войти в личный кабинет.',
    register_desc: 'Укажите имя, номер телефона и пароль, чтобы создать защищённый аккаунт.',
    field_phone: 'Номер телефона',
    field_name: 'Ваше имя',
    field_name_placeholder: 'Например: Сомон',
    field_password: 'Пароль',
    field_password_placeholder: 'Минимум 6 символов',
    field_password_confirm: 'Повторите пароль',
    field_password_confirm_placeholder: 'Введите пароль ещё раз',
    btn_login: 'Войти',
    btn_register: 'Зарегистрироваться',
    no_account: 'Нет аккаунта?',
    have_account: 'Уже есть аккаунт?',
    switch_to_register: 'Создайте аккаунт',
    switch_to_login: 'Войдите в систему',
    err_phone_length: 'Введите номер телефона полностью',
    err_password_short: 'Пароль должен быть не менее 6 символов',
    err_password_mismatch: 'Пароли не совпадают',
    err_login: 'Неверный номер телефона или пароль.',
    msg_success_login: 'Добро пожаловать!',
    msg_success_register: 'Ваш аккаунт успешно создан!',

    // Cart
    cart_title: 'Корзина покупателя',
    cart_empty: 'Ваша корзина пуста',
    cart_empty_desc: 'Вы ещё не выбрали ни одного товара. Давайте выберем вместе!',
    cart_total: 'Итого:',
    cart_free_ship: 'Активирована бесплатная доставка!',
    cart_btn_checkout: 'Перейти к оформлению',
    cart_btn_back: 'Вернуться в корзину',

    // Checkout Form
    checkout_title: 'Информация для доставки',
    checkout_desc: 'Пожалуйста, укажите точный адрес, чтобы мы могли доставить товар к вашему порогу.',
    checkout_village: 'Название села (или города)',
    checkout_village_placeholder: 'Например: село Сомониен',
    checkout_landmark: 'Улица, номер дома или ориентир',
    checkout_landmark_placeholder: 'Например: улица Бахор, дом 12, около школы',
    checkout_notes: 'Дополнительные примечания',
    checkout_notes_placeholder: 'Если у вас есть особые пожелания, напишите здесь',
    checkout_error: 'Пожалуйста, заполните имя, номер телефона и село',
    checkout_payment: 'Способ оплаты',
    pay_cash: 'Наличными при доставке',
    pay_card: 'Банковская карта (Алиф/ДС)',
    pay_terminal: 'Через терминал',
    checkout_btn_submit: 'Подтвердить заказ',

    // Order Done
    done_title: 'Ваш заказ принят!',
    done_num: 'Номер заказа:',
    done_desc: 'Мы свяжемся с вами в ближайшее время для уточнения деталей. Спасибо за покупку!',
    done_btn_continue: 'Вернуться в магазин',

    // Products Catalog
    prod_title: 'Всё необходимое для вашего дома',
    prod_desc: 'От цемента и кирпича до красок и инструментов — выбирайте качественные материалы по честным ценам, а мы быстро и бережно доставим их к вашему порогу.',
    prod_hero_badge: '✦ Гарантия качества и честные цены',
    prod_hero_delivery: 'Бесплатная доставка от 5000 сомони',
    prod_hero_quality: 'Гарантия качества',
    prod_hero_count: 'видов товаров',
    prod_loading: 'Товары загружаются...',
    prod_not_found: 'Товары не найдены',
    prod_no_img: 'Нет изображения',
    prod_btn_add: 'В корзину',
    prod_unit_piece: 'шт',
    prod_admin_add: 'Новый товар',
    prod_admin_edit: 'Редактировать',
    prod_admin_delete_confirm: 'Вы уверены, что хотите удалить этот товар?',

    // Product Detail
    detail_back: 'Вернуться к списку',
    detail_instock: 'В наличии на складе:',
    detail_outstock: 'Нет в наличии',
    detail_added: 'Добавлено в корзину!',

    // AI Advisor Widget
    ai_title: 'Консультант магазина (ИИ)',
    ai_status: 'В сети (Онлайн)',
    ai_greeting: 'Привет! Я виртуальный помощник Barg.tj. Задайте свой вопрос по поводу цен на товары или условий доставки, и я помогу вам!',
    ai_placeholder: 'Напишите ваш вопрос...',
    ai_typing: 'Думаю и ищу информацию...',
    ai_error: 'К сожалению, не удалось подключиться к сети. Пожалуйста, попробуйте немного позже.',

    // Admin Panel
    admin_title: 'Панель Руководителя (CRM & ERP)',
    admin_nav_dashboard: 'Аналитика',
    admin_nav_products: 'Товары',
    admin_nav_ai: 'ИИ Аналитик',
    admin_nav_logout: 'Выйти',
    admin_nav_admin_role: 'Администратор',
    admin_loading: 'Загрузка...',
    admin_error: 'Ошибка при загрузке аналитики.',
    admin_net_profit_today: 'Чистая Прибыль (Сегодня)',
    admin_revenue_today: 'Выручка (Сегодня)',
    admin_orders_today: 'Новые Заказы (Сегодня)',
    admin_low_stock: 'Мало на складе',
    admin_growth_compare: 'Сравнение с вчера',
    admin_out_of_stock: 'Полностью распродано',
    admin_capital_title: 'Анализ Капитала и Склада',
    admin_wholesale_value: 'Себестоимость товаров',
    admin_retail_value: 'Розничная стоимость (Retail Value)',
    admin_potential_profit: 'Потенциальная прибыль',
    admin_restock_budget: 'Бюджет для закупки (Пополнение)',
    admin_summary_30: 'Итоги за 30 дней',
    admin_total_revenue: 'Общая выручка',
    admin_average_order: 'Средний чек (AOV)',
    admin_orders_count: 'Количество заказов',
    admin_margin: 'Маржинальность бизнеса',
    admin_conversion: 'Процент выполнения',
    admin_order_status_title: 'Статус Заказов',
    admin_status_new: 'Новые',
    admin_status_accepted: 'Принятые',
    admin_status_delivering: 'В пути',
    admin_status_completed: 'Доставленные',
    admin_status_cancelled: 'Отмененные',

    // Analytics charts & reports
    admin_range_7: '7 дней',
    admin_range_30: '30 дней',
    admin_range_90: '90 дней',
    admin_export_csv: 'Скачать отчёт (CSV)',
    admin_chart_revenue_title: 'Динамика Выручки и Чистой Прибыли',
    admin_chart_revenue_sub: 'Данные только по завершённым заказам (Доставленные)',
    admin_revenue: 'Выручка',
    admin_profit: 'Чистая прибыль',
    admin_top_products_title: 'Топ Товаров по Прибыли',
    admin_category_title: 'Выручка по Категориям',
    admin_top_customers_title: 'Лучшие Покупатели (VIP)',
    admin_no_data: 'Пока нет данных за этот период',
    admin_sold_word: 'продано',
    admin_orders_word: 'заказ.',
    admin_customers_total: 'Всего клиентов',
    admin_donut_center: 'Выручка',
    admin_ai_title: 'Бизнес-Аналитик (ИИ)',
    admin_ai_subtitle: 'Общайтесь с живыми данными вашего склада и финансов',
    admin_ai_placeholder: 'Задайте вопрос (напр: Какой товар приносит больше всего прибыли?)',
    admin_ai_greeting: 'Привет! Я ваш бизнес-аналитик. Я могу проанализировать продажи, выручку, чистую прибыль и запасы на складе. Какой отчет вам нужен?',
    admin_ai_typing: 'Анализирую данные...',
    admin_ai_send: 'Отправить',
    admin_prod_title: 'Управление Товарами',
    admin_prod_add_btn: 'Добавить товар',
    admin_prod_table_img: 'Фото',
    admin_prod_table_name: 'Название',
    admin_prod_table_sku: 'Артикул',
    admin_prod_table_price: 'Цена продажи',
    admin_prod_table_cost: 'Себестоимость',
    admin_prod_table_stock: 'Остаток',
    admin_prod_table_actions: 'Действия',
    admin_confirm_delete: 'Вы уверены, что хотите удалить этот товар?',
    admin_err_delete: 'Ошибка при удалении!',
    admin_err_save: 'Ошибка при сохранении.',
    admin_prod_modal_edit: 'Редактирование товара',
    admin_prod_modal_new: 'Новый товар',
    admin_form_category: 'Категория *',
    admin_form_name_tj: 'Название (Тадж) *',
    admin_form_name_ru: 'Название (Рус) *',
    admin_form_sku: 'Артикул (SKU) *',
    admin_form_unit: 'Единица измерения *',
    admin_form_price: 'Цена продажи (TJS) *',
    admin_form_cost: 'Себестоимость (Себестоимость)',
    admin_form_stock: 'Количество на складе *',
    admin_form_desc: 'Описание',
    admin_btn_cancel: 'Отмена',
    admin_btn_submit: 'Добавить',
    admin_btn_save_changes: 'Сохранить изменения',
    admin_form_image: 'Фото товара',
    admin_form_image_hint: 'Выберите изображение (JPG/PNG)',

    // Admin Orders
    admin_nav_orders: 'Заказы',
    ord_title: 'Управление Заказами',
    ord_subtitle: 'Новые заказы появляются здесь и в группе Telegram',
    ord_filter_all: 'Все',
    ord_empty: 'Заказов пока нет',
    ord_customer: 'Клиент',
    ord_address: 'Адрес',
    ord_items: 'Товары',
    ord_total: 'Итого',
    ord_payment: 'Оплата',
    ord_courier: 'Курьер',
    ord_assign_courier: 'Назначить курьера',
    ord_no_courier: 'Не назначен',
    ord_created: 'Время',
    ord_mark_accepted: 'Принять',
    ord_mark_delivering: 'Отправить в путь',
    ord_mark_completed: 'Завершить',
    ord_mark_cancelled: 'Отменить',
    ord_confirm_cancel: 'Точно отменить заказ? Товары вернутся на склад.',

    // Admin Manual Sale (POS)
    admin_nav_sale: 'Ручная продажа',
    sale_title: 'Ручная продажа в магазине',
    sale_subtitle: 'Продали товар на кассе? Отметьте здесь — остаток уменьшится автоматически.',
    sale_search: 'Поиск товара по названию или артикулу...',
    sale_no_results: 'Ничего не найдено',
    sale_cart_title: 'Корзина продажи',
    sale_cart_empty: 'Корзина пуста. Выберите товар из списка.',
    sale_qty: 'Кол-во',
    sale_total: 'Сумма продажи',
    sale_customer: 'Имя клиента (необязательно)',
    sale_phone: 'Телефон (необязательно)',
    sale_confirm: 'Подтвердить продажу',
    sale_success: 'Продажа записана! Остаток обновлён.',
    sale_out: 'Нет в наличии',
    sale_clear: 'Очистить',
    sale_in_stock: 'На складе'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ru');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language;
    if (saved === 'tj' || saved === 'ru') {
      setLang(saved);
    } else {
      setLang('ru');
    }
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: string) => {
    return translations[lang]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
