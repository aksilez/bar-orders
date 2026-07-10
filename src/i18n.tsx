import { createContext, useContext } from 'react'

export type Lang = 'en' | 'sk'

const STRINGS = {
  en: {
    indoor: 'Indoor',
    outdoor: 'Outdoor',
    menu: 'Menu',
    summary: 'Summary',
    editLayout: 'Edit layout',
    done: '✓ Done',
    loading: 'Loading…',
    addTable: '+ Add table',
    floorHint: 'Drag a table to move it · drag the corner to resize · tap it to rename or delete',
    noTablesEmpty: 'No tables in this area yet.',
    noTablesAddHint: 'Tap “+ Add table”.',
    noTablesEditHint: 'Switch to “Edit layout” to add one.',
    free: 'Free',
    editTable: 'Edit table',
    tableName: 'Table name',
    tableHasOrder: 'This table has an active order and can’t be deleted.',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    confirmDeleteTable: 'Delete table “{0}”?',
    tableBase: 'Table',
    confirm: 'Confirm',
    noItems: 'No items yet — tap a product on the right to add it.',
    each: 'each',
    total: 'Total',
    markPaid: 'Mark as paid',
    tapAgainPay: 'Tap again to confirm payment',
    confirmRemoveItem: 'Remove “{0}” from the order?',
    noProducts: 'No products yet — add some in the Menu tab.',
    addProduct: '+ Add product',
    addCategory: '+ Add category',
    edit: 'Edit',
    newProduct: 'New product',
    editProduct: 'Edit product',
    name: 'Name',
    priceEur: 'Price (€)',
    category: 'Category',
    newCategory: 'New category',
    categoryName: 'Category name',
    add: 'Add',
    emptyCategory: 'No products in this category yet.',
    confirmDeleteProduct: 'Delete “{0}” from the menu?',
    confirmDeleteCategory: 'Delete category “{0}”?',
    today: 'Today',
    yesterday: 'Yesterday',
    revenue: 'Revenue',
    paidOrders: 'Paid orders',
    noOrdersDay: 'No paid orders on this day.',
    deleteHistory: 'Delete history',
    deleteShownDay: 'Delete shown day ({0})',
    pickDay: 'Or pick a day to delete',
    deletePickedDay: 'Delete selected day',
    deleteAllHistory: 'Delete entire history',
    confirmDeleteDay: 'Delete all orders from {0}? This cannot be undone.',
    confirmDeleteAll: 'Delete the ENTIRE history? This cannot be undone.',
    settings: 'Settings',
    language: 'Language',
    close: 'Close',
  },
  sk: {
    indoor: 'Interiér',
    outdoor: 'Terasa',
    menu: 'Menu',
    summary: 'Prehľad',
    editLayout: 'Upraviť rozloženie',
    done: '✓ Hotovo',
    loading: 'Načítavam…',
    addTable: '+ Pridať stôl',
    floorHint: 'Potiahni stôl pre presun · potiahni roh pre zmenu veľkosti · ťukni naň pre premenovanie alebo vymazanie',
    noTablesEmpty: 'V tejto zóne zatiaľ nie sú žiadne stoly.',
    noTablesAddHint: 'Ťukni na „+ Pridať stôl“.',
    noTablesEditHint: 'Prepni na „Upraviť rozloženie“ a pridaj stôl.',
    free: 'Voľný',
    editTable: 'Upraviť stôl',
    tableName: 'Názov stola',
    tableHasOrder: 'Tento stôl má aktívnu objednávku a nedá sa vymazať.',
    delete: 'Vymazať',
    cancel: 'Zrušiť',
    save: 'Uložiť',
    confirmDeleteTable: 'Vymazať stôl „{0}“?',
    tableBase: 'Stôl',
    confirm: 'Potvrdiť',
    noItems: 'Zatiaľ žiadne položky — ťukni na produkt vpravo.',
    each: '/ kus',
    total: 'Spolu',
    markPaid: 'Označiť ako zaplatené',
    tapAgainPay: 'Ťukni ešte raz pre potvrdenie platby',
    confirmRemoveItem: 'Odstrániť „{0}“ z objednávky?',
    noProducts: 'Žiadne produkty — pridaj ich v záložke Menu.',
    addProduct: '+ Pridať produkt',
    addCategory: '+ Pridať kategóriu',
    edit: 'Upraviť',
    newProduct: 'Nový produkt',
    editProduct: 'Upraviť produkt',
    name: 'Názov',
    priceEur: 'Cena (€)',
    category: 'Kategória',
    newCategory: 'Nová kategória',
    categoryName: 'Názov kategórie',
    add: 'Pridať',
    emptyCategory: 'V tejto kategórii zatiaľ nie sú produkty.',
    confirmDeleteProduct: 'Vymazať „{0}“ z menu?',
    confirmDeleteCategory: 'Vymazať kategóriu „{0}“?',
    today: 'Dnes',
    yesterday: 'Včera',
    revenue: 'Tržba',
    paidOrders: 'Zaplatené objednávky',
    noOrdersDay: 'V tento deň nie sú žiadne zaplatené objednávky.',
    deleteHistory: 'Vymazať históriu',
    deleteShownDay: 'Vymazať zobrazený deň ({0})',
    pickDay: 'Alebo vyber deň na vymazanie',
    deletePickedDay: 'Vymazať vybraný deň',
    deleteAllHistory: 'Vymazať celú históriu',
    confirmDeleteDay: 'Vymazať všetky objednávky z {0}? Toto sa nedá vrátiť späť.',
    confirmDeleteAll: 'Vymazať CELÚ históriu? Toto sa nedá vrátiť späť.',
    settings: 'Nastavenia',
    language: 'Jazyk',
    close: 'Zavrieť',
  },
} satisfies Record<Lang, Record<string, string>>

export type StrKey = keyof (typeof STRINGS)['en']

export const I18nContext = createContext<Lang>('en')

export function tFor(lang: Lang) {
  return (key: StrKey, arg?: string): string => {
    const s = STRINGS[lang][key]
    return arg !== undefined ? s.replace('{0}', arg) : s
  }
}

export function useT() {
  return tFor(useContext(I18nContext))
}

export function useLang(): Lang {
  return useContext(I18nContext)
}

export function localeOf(lang: Lang): string {
  return lang === 'sk' ? 'sk-SK' : 'en-GB'
}
