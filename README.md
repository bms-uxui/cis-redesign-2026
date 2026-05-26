# React Design Starter / ชุดเริ่มต้นออกแบบ React

โปรเจกต์สำหรับนักออกแบบ — ติดตั้งครั้งเดียว พร้อมใช้งานทันที ไม่ต้องตั้งค่าอะไรเพิ่ม

## เริ่มต้นใช้งาน

```bash
# 1. โคลนโปรเจกต์
git clone https://github.com/YOUR_USERNAME/react-starter.git
cd react-starter

# 2. ติดตั้ง dependencies
npm install

# 3. เปิด dev server
npm run dev

# 4. เปิดเบราว์เซอร์ไปที่ http://localhost:5173
```

> ต้องการ Node.js — ถ้ายังไม่มี ดาวน์โหลดที่ https://nodejs.org (เลือก LTS)

---

## สำหรับนักออกแบบ

### ไฟล์ที่ต้องแก้ไข

คุณแก้ไขแค่ **1 ไฟล์**:

```
src/pages/Playground.tsx   ← แก้ไขไฟล์นี้เท่านั้น
```

ทุกอย่างถูก import ไว้ให้แล้ว — แค่เขียน JSX ได้เลย

### ตัวอย่างการใช้งาน

```tsx
// ใน Playground.tsx — ลบการ์ดตัวอย่างแล้วเริ่มเขียนตรงนี้:

<Card className="p-4">
  <CardBody className="space-y-4">
    <Input label="ชื่อ" placeholder="พิมพ์ชื่อ..." />
    <Input label="อีเมล" placeholder="you@example.com" startContent={<Mail size={16} />} />
    <Button color="primary" startContent={<Heart size={16} />}>
      บันทึก
    </Button>
  </CardBody>
</Card>
```

บันทึกไฟล์ → เบราว์เซอร์จะรีเฟรชทันที (Hot Reload)

---

## หน้าต่างๆ ในโปรเจกต์

| URL | หน้า | คำอธิบาย |
|-----|------|----------|
| `/` | หน้าหลัก | ภาพรวมของ UI framework ทั้งหมด |
| `/playground` | สนามเด็กเล่น | **พื้นที่ออกแบบของคุณ** |
| `/docs` | เอกสาร | รายการคอมโพเนนต์ HeroUI ทั้ง 18 ตัว |
| `/docs/input` | เอกสาร Input | เอกสารแต่ละคอมโพเนนต์ (เปลี่ยน input เป็นชื่ออื่นได้) |

---

## UI Framework ที่พร้อมใช้

### HeroUI (แนะนำ — ใช้ง่ายที่สุด)
```tsx
import { Button, Card, CardBody, Input, Chip, Avatar, Modal, Tabs, Select } from "@heroui/react";
```
เอกสาร: https://www.heroui.com/docs

### Material UI (MUI)
```tsx
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
```
เอกสาร: https://mui.com/material-ui/

### Radix UI
```tsx
import { Button, Card, Flex, Text, Badge, Switch } from "@radix-ui/themes";
```
เอกสาร: https://www.radix-ui.com/themes/docs

---

## ไอคอน Lucide

ไอคอนมากกว่า 1,500 ตัว — ดูทั้งหมดที่ https://lucide.dev/icons/

```tsx
import { Heart, Star, Search, Bell, Settings, User, Home, Mail } from "lucide-react";

// ใช้งาน:
<Heart size={20} />
<Search size={16} className="text-gray-400" />
```

ไอคอนที่ import ไว้ให้แล้วใน Playground.tsx:

`Heart` `Star` `Search` `Bell` `Settings` `User` `Home` `Mail` `Plus` `ArrowRight` `Check` `X` `Menu` `ChevronDown` `Download` `Upload` `Trash2` `Edit3` `Eye` `EyeOff` `Copy` `Share2` `Bookmark` `Filter` `MoreHorizontal` `Calendar` `Clock` `MapPin` `Phone` `Globe` `Zap` `ShoppingCart` `CreditCard` `Package` `TrendingUp` `BarChart3` `PieChart` `Image` `Camera` `Mic` `Play` `Pause` `SkipForward` `Volume2` `Sun` `Moon` `Cloud` `Wifi` `Lock` `Unlock` `Shield` `AlertCircle` `Info` `HelpCircle` `ThumbsUp` `MessageCircle` `Send`

ต้องการไอคอนเพิ่ม? เพิ่ม import ได้เลย:
```tsx
import { Rocket, Flame, Trophy } from "lucide-react";
```

---

## ฟอนต์

- **ภาษาอังกฤษ**: Google Sans
- **ภาษาไทย**: Noto Sans Thai
- ตั้งค่าไว้แล้ว — ใช้งานได้ทันที ไม่ต้องทำอะไรเพิ่ม

---

## สี (Design Tokens)

สีหลักที่ใช้ใน Tailwind CSS:

| ชื่อ | สี | Tailwind class |
|------|-----|----------------|
| Primary | `#4285F4` | `text-primary` `bg-primary` |
| Secondary | `#34A853` | `text-secondary` `bg-secondary` |
| Accent | `#FBBC05` | `text-accent` `bg-accent` |
| Danger | `#EA4335` | `text-danger` `bg-danger` |
| Background | `#F8F9FA` | `bg-background` |
| Text | `#202124` | `text-text` |
| Text Muted | `#5F6368` | `text-text-muted` |

แก้ไขสีได้ที่ `src/index.css` ในส่วน `@theme`

---

## โครงสร้างโปรเจกต์

```
src/
├── pages/
│   ├── Playground.tsx        ← ไฟล์ที่คุณแก้ไข
│   └── docs/
│       ├── DocsIndex.tsx     ← หน้ารวมเอกสาร
│       └── DocEmbed.tsx      ← wrapper สำหรับ iframe
├── components/               ← สร้างคอมโพเนนต์ที่ใช้ซ้ำได้ที่นี่
├── App.tsx                   ← หน้าแรก (ไม่ต้องแก้)
├── main.tsx                  ← providers + routing (ไม่ต้องแก้)
├── index.css                 ← ฟอนต์ + สี (แก้ได้ถ้าต้องการเปลี่ยนสี)
└── hero.ts                   ← HeroUI plugin (ไม่ต้องแก้)
```

---

## คำถามที่พบบ่อย

**ถ: ต้องรู้ React เก่งไหม?**
ตอบ: ไม่ต้อง แค่เขียน HTML-like (JSX) ได้ก็พอ ดูตัวอย่างจากเอกสาร `/docs` แล้วก็อปมาแก้

**ถ: เพิ่มหน้าใหม่ได้ไหม?**
ตอบ: ได้ สร้างไฟล์ใน `src/pages/` แล้วเพิ่ม Route ใน `src/main.tsx`

**ถ: ต้องการ package เพิ่มเติม?**
ตอบ: รัน `npm install ชื่อ-package` ในเทอร์มินัล

**ถ: เบราว์เซอร์ไม่อัพเดต?**
ตอบ: ลอง Cmd+Shift+R (Hard Refresh)
