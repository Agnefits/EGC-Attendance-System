import { db } from './firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

export async function seedDatabase() {
  // الكليات
  const colleges = [
    { id: 'FIT', name: 'كلية تكنولوجيا المعلومات', nameEn: 'Faculty of IT', code: 'FIT' },
    { id: 'FE',  name: 'كلية الكهرباء والميكانيكا ',         nameEn: 'Faculty of Engineering', code: 'FE' },
    { id: 'FBS', name: 'كلية علوم صحية',   nameEn: 'Faculty of Business', code: 'FBS' },
  ];

  // الأقسام
  const departments = [
    { id: 'CS',  name: 'علوم الحاسب',         nameEn: 'Computer Science',      code: 'CS',  collegeId: 'FIT' },
    { id: 'IS',  name: 'نظم المعلومات',        nameEn: 'Information Systems',   code: 'IS',  collegeId: 'FIT' },
    { id: 'CE',  name: 'هندسة الحاسبات',       nameEn: 'Computer Engineering',  code: 'CE',  collegeId: 'FE'  },
    { id: 'ME',  name: 'الهندسة الميكانيكية',  nameEn: 'Mechanical Engineering',code: 'ME',  collegeId: 'FE'  },

  ];

  // الموظفين
  const employees = [
    { id: 'EMP001', name: 'عمرو عادل',   nameEn: 'Amr Adel',    email: 'Amr@aitu.edu', phone: '01012345678', type: 'academic',       departmentId: 'CS',  collegeId: 'FIT', status: 'active' },
    { id: 'EMP002', name: 'محمد عبدالله',   nameEn: 'Mohamed Abdallah',    email: 'Mohamed@aitu.edu',    phone: '01098765432', type: 'administrative', departmentId: 'IS',  collegeId: 'FIT', status: 'active' },
    { id: 'EMP003', name: 'أنس الراوي ',  nameEn: 'Anas Elrawy',    email: 'Anas@aitu.edu',   phone: '01011112222', type: 'academic',       departmentId: 'CE',  collegeId: 'FE',  status: 'active' },
    { id: 'EMP004', name: 'يسرا أسامة', nameEn: 'Yousraa Osama',   email: 'yousraa@aitu.edu',    phone: '01033334444', type: 'academic',       departmentId: 'BA',  collegeId: 'FBS', status: 'active' },
    { id: 'EMP005', name: 'راندا صبرى',  nameEn: 'Randa Sabry',    email: 'Randa@aitu.edu',    phone: '01055556666', type: 'administrative', departmentId: 'ACC', collegeId: 'FBS', status: 'active' },
  ];

  // حفظ الكليات
  for (const college of colleges) {
    await setDoc(doc(db, 'colleges', college.id), college);
    console.log('✅ كلية:', college.name);
  }

  // حفظ الأقسام
  for (const dept of departments) {
    await setDoc(doc(db, 'departments', dept.id), dept);
    console.log('✅ قسم:', dept.name);
  }

  // حفظ الموظفين
  for (const emp of employees) {
    await setDoc(doc(db, 'employees', emp.id), emp);
    console.log('✅ موظف:', emp.name);
  }

  console.log('🎉 تم حفظ كل الداتا بنجاح!');
}