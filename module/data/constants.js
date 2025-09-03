export const SEX = {
    MALE: "Male",
    FEMALE: "Female",
};
export const COMPETENCES = Object.fromEntries(
    Object.keys({
        mentales:"",connaissances:"",erudition:"",observation:"",alchimie:"",prophetie:"",
        physiques:"",mobilite:"",discretion:"",dexterite:"",survie:"",endurance:"",force:"",equitation:"",
        sociales:"",charisme:"",negociation:"",tromperie:"",
        techniques:"",medecine:"",objet:"",assassinat:"",bouclier:"",tueur:"",
        combats:"",combat:"",hast:"",cc:"",lancer:"",melee:"",tir:"",visee:""
    }).map(attr => [attr, Liber.Character.Competences.${attr}])
);