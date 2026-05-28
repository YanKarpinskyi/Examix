import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext'; 
import examImg from '../assets/features/exam-feature.png';
import checkImg from '../assets/features/checking-feature.png';
import statImg from '../assets/features/stat-feature.png';
import './Home.scss';

function Home() {
  const { isDark } = useTheme();

  return (
    <div className={`home-page${isDark ? " dark" : ""}`}>
      <header>
        <nav className="headerLinks">
          <a href="#">Про нас</a>
          <a href="#">Контакти</a>
        </nav>
        <div className="authButtons">
          <Link className="authBtn" title='Увійти' to="/login" id="login">Увійти</Link>
          <Link className="authBtn" title='Зареєструватися' to="/register" id="signup">Зареєструватися</Link>
        </div>
      </header>

      <h1>Готуйся до НМТ ефективно</h1>
      <p>Тренувальні тести, аналітика прогресу та актуальні завдання в одному місці</p>
      <button className="startBtn">Почати безкоштовно</button>

      <div className="facts">
        <div>
          <p className="factsNumber">12 400+</p>
          <p className="factsDescr">студентів</p>
        </div>
        <div>
          <p className="factsNumber">3 500+</p>
          <p className="factsDescr">завдань</p>
        </div>
        <div>
          <p className="factsNumber">98%</p>
          <p className="factsDescr">задоволених</p>
        </div>
      </div>

      <section>
        <h2>Чому нас обирають?</h2>
        <div className="featuresGrid">
          <div className={`feature${isDark ? " dark" : ""}`}>
            <img src={examImg} alt="" className="featureImg"/>
            <h3 className="featureName">Реальні умови іспиту</h3>
            <p className="featureDescr">Формат максимально наближений до офіційних іспитів</p>
          </div>
          
          <div className={`feature${isDark ? " dark" : ""}`}>
            <img src={checkImg} alt="" className="featureImg" id="checkFeature"/>
            <h3 className="featureName">Миттєва перевірка</h3>
            <p className="featureDescr">Результат одразу після завершення завдань</p>
          </div>
          
          <div className={`feature${isDark ? " dark" : ""}`}>
            <img src={statImg} alt="" className="featureImg"/>
            <h3 className="featureName">Статистика по темах</h3>
            <p className="featureDescr">Відстежуй прогрес і знаходь слабкі місця</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;