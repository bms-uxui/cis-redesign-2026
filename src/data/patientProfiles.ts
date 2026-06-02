import type { OPDRight, OPDListRow, OPDAllergy, OPDListKey } from "../types";

export interface OPDProfileSeed {
  form: Record<string, string>;
  flags: Record<string, boolean>;
  rights: OPDRight[];
  drugAllergies: OPDAllergy[];
  lists: Partial<Record<OPDListKey, OPDListRow[]>>;
}

const profiles: Record<string, OPDProfileSeed> = {
  "680001": {
    form: {
      race: "ไทย",
      religion: "พุทธ",
      occupation: "พนักงานบริษัท",
      marital: "สมรส",
      siblingsCount: "3",
      childOrder: "1",
      fatherFirstName: "สมบัติ",
      fatherLastName: "ใจดี",
      motherFirstName: "สุนีย์",
      motherLastName: "ใจดี",
      spouseFirstName: "ลัดดา",
      spouseLastName: "ใจดี",
      spousePhone: "081-987-6543",
      contactFirstName: "ลัดดา",
      contactLastName: "ใจดี",
      contactRelation: "คู่สมรส",
      contactPhone: "081-987-6543",
      houseNo: "112/4",
      moo: "5",
      road: "พหลโยธิน",
      subdistrict: "คลองหลวง",
      district: "คลองหลวง",
      province: "ปทุมธานี",
      postal: "12120",
      country: "ไทย",
      homePhone: "02-555-1234",
      mobilePhone: "081-234-5678",
      familyStatus: "หัวหน้าครอบครัว",
      personStatus: "มีชีวิต",
      education: "ปริญญาตรี",
      personType: "ประชาชนทั่วไป",
      reporterName: "ลัดดา ใจดี",
      reporterRelation: "คู่สมรส",
    },
    flags: { inResponsibleArea: true, consentGiven: true },
    rights: [
      {
        id: "r1",
        code: "10",
        name: "บัตรทอง",
        no: "1103702456789",
        begin: "2024-10-01",
        expire: "2025-09-30",
      },
    ],
    drugAllergies: [
      {
        id: "a1",
        data: {
          drug: "Penicillin",
          symptom: "ผื่นแดง คัน",
          seriousness: "ปานกลาง",
          reportDate: "2022-08-15",
          reporter: "พญ. นพมาศ ใจดี",
        },
        flags: { banned: true },
      },
    ],
    lists: {
      chronic: [
        { id: "c1", data: { name: "ความดันโลหิตสูง", icd: "I10", note: "ควบคุมได้ดีด้วยยา" } },
      ],
      appointment: [
        {
          id: "ap1",
          data: {
            status: "นัดติดตาม",
            visitDate: "2026-05-21",
            nextDate: "2026-06-21",
            nextTime: "09:00",
            doctor: "นพ. ชารีฟ ราอูล",
            clinic: "อายุรกรรม",
            cause: "ติดตามค่าความดัน",
          },
        },
      ],
    },
  },
  "680002": {
    form: {
      race: "ไทย",
      religion: "พุทธ",
      occupation: "พยาบาล",
      marital: "สมรส",
      houseNo: "55/1",
      subdistrict: "บางบำหรุ",
      district: "บางพลัด",
      province: "กรุงเทพมหานคร",
      postal: "10700",
      country: "ไทย",
      mobilePhone: "089-111-2222",
    },
    flags: { consentGiven: true },
    rights: [
      {
        id: "r2",
        code: "20",
        name: "ประกันสังคม",
        no: "SSO-998877",
        begin: "2010-04-01",
        expire: "2026-12-31",
      },
    ],
    drugAllergies: [],
    lists: {
      chronic: [
        { id: "c2", data: { name: "เบาหวานชนิดที่ 2", icd: "E11", note: "" } },
      ],
    },
  },
};

export function getPatientProfile(hn: string): OPDProfileSeed | undefined {
  return profiles[hn];
}

export const emptyProfile: OPDProfileSeed = {
  form: {},
  flags: {},
  rights: [],
  drugAllergies: [],
  lists: {},
};
