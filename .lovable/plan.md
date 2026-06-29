## الخطة: إضافة شاشة "التهيئة" مع شريط تنقل خاص

### 1. تعديل `NavigationBar.tsx` (الشريط الرئيسي)
- إزالة الأيقونات التالية من القائمة:
  - إدارة العملات (`currency-management`)
  - إدارة المحافظات (`governorate-management`)
  - إدارة المجموعات (`group-management`)
  - كلمة المرور (`password-settings`)
- إضافة أيقونة جديدة **"التهيئة"** (Settings icon) بجانب أيقونة **المبيعات** مباشرة.
- عند الضغط عليها، يتم استدعاء `onScreenChange('setup')` لفتح شاشة التهيئة.

### 2. إنشاء مكون جديد `SetupScreen.tsx`
شاشة مستقلة تحتوي على:
- **إطار علوي (Header Frame)**:
  - عنوان الشاشة: "شاشة التهيئة"
  - زر **"رجوع"** (سهم + نص) → يعيد المستخدم إلى الشاشة الرئيسية (`chart-of-accounts` أو الشاشة السابقة).
- **شريط تنقل خاص (SetupNavigationBar)** بنفس تصميم `NavigationBar` يحتوي على:
  - إدارة العملات
  - إدارة المحافظات
  - إدارة المجموعات
  - كلمة المرور
- **منطقة محتوى** تعرض الشاشة المختارة من الشريط (مع الحفاظ على نمط `visited` لإبقاء الحالة).

### 3. تعديل `MainDashboard.tsx`
- إضافة نوع شاشة جديد `'setup'` ضمن `ScreenType` (في `src/types/accounting.ts`).
- عند `activeScreen === 'setup'`، عرض `SetupScreen` بدلاً من الشاشات الأخرى.
- تمرير دالة "رجوع" لإعادة `activeScreen` إلى الشاشة الرئيسية.
- شاشات (إدارة العملات/المحافظات/المجموعات/كلمة المرور) ستُعرض داخل `SetupScreen` بدلاً من الشريط الرئيسي.

### 4. تعديل `src/types/accounting.ts`
- إضافة `'setup'` إلى نوع `ScreenType`.

### الملفات المتأثرة
- `src/components/NavigationBar.tsx` (تعديل)
- `src/components/MainDashboard.tsx` (تعديل)
- `src/components/screens/SetupScreen.tsx` (جديد)
- `src/types/accounting.ts` (إضافة نوع)

### ملاحظات
- يتم الحفاظ على الحالة (state) داخل شاشة التهيئة عند التنقل بين شاشاتها الفرعية، تماشياً مع نمط `visited` المستخدم حالياً.
- التصميم يتبع نفس ستايل `NavigationBar` الحالي (gradient-primary للنشط، أيقونات + نصوص).
- زر الرجوع سيظهر في أعلى الإطار بحجم مناسب للمس (≥44px).
