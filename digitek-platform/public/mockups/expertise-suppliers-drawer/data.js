// Representative sample data for the expertise→suppliers drawer mockups.
// In the real module this comes from Supabase; here it's a small slice so the
// drawer shows real-looking content. Mapping is cluster→cluster (נספח ב' → ד1/ד2).
window.DATA = {
  // The expertise cluster the user is currently inside (נספח ב')
  context: {
    expertiseClusterId: 5,
    expertiseClusterName: 'ניהול מוצר',
    expertiseIcon: '🧭',
    specName: 'ניהול מוצר',
    // resolved by cluster→cluster mapping:
    domain: 'digital',
    domainLabel: 'ספקי דיגיטל',
    supplierClusterName: 'ניהול מוצר',
    accent: '#7c3aed',      // digital = purple
    accentBg: '#f5f3ff',
  },
  // Specializations inside the mapped supplier cluster (for the in-drawer filter)
  specs: [
    { id: 's1', name: 'ניהול מוצר', count: 8 },
    { id: 's2', name: 'ניהול מוצר דיגיטלי', count: 5 },
    { id: 's3', name: 'אסטרטגיית מוצר', count: 4 },
  ],
  suppliers: [
    { id:'v1', name:'מטריקס אי.טי', manof:'25412', agreement:'2023/07-114', validTo:'2026-12-31',
      specs:['ניהול מוצר','אסטרטגיית מוצר'], large:2, small:1, contact:'רכש · procurement@matrix.co.il' },
    { id:'v2', name:'נס טכנולוגיות', manof:'25419', agreement:'2023/07-121', validTo:'2026-12-31',
      specs:['ניהול מוצר','ניהול מוצר דיגיטלי'], large:2, small:0, contact:'מכרזים · tenders@ness.co.il' },
    { id:'v3', name:'טאלדור מערכות', manof:'25433', agreement:'2023/07-133', validTo:'2026-12-31',
      specs:['ניהול מוצר דיגיטלי'], large:1, small:1, contact:'רכש · bids@taldor.co.il' },
    { id:'v4', name:'אמן מחשבים', manof:'25401', agreement:'2023/07-101', validTo:'2026-10-15',
      specs:['ניהול מוצר','אסטרטגיית מוצר'], large:1, small:2, contact:'מכרזים · office@aman.co.il' },
    { id:'v5', name:'וואן טכנולוגיות', manof:'25444', agreement:'2023/07-148', validTo:'2026-12-31',
      specs:['אסטרטגיית מוצר'], large:0, small:1, contact:'רכש · info@one1.co.il' },
    { id:'v6', name:'מלם תים', manof:'25460', agreement:'2023/07-160', validTo:'2027-03-01',
      specs:['ניהול מוצר','ניהול מוצר דיגיטלי','אסטרטגיית מוצר'], large:3, small:0, contact:'מכרזים · tenders@malam.com' },
    { id:'v7', name:'סאפיינס', manof:'25472', agreement:'2023/07-172', validTo:'2026-12-31',
      specs:['ניהול מוצר דיגיטלי'], large:1, small:0, contact:'רכש · gov@sapiens.com' },
    { id:'v8', name:'אלעד מערכות', manof:'25488', agreement:'2023/07-188', validTo:'2026-08-20',
      specs:['ניהול מוצר'], large:0, small:1, contact:'מכרזים · bids@elad.co.il' },
  ],
}
