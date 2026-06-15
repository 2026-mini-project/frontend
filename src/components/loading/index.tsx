import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './styles.module.css';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

export default function Loading() {
    return <div className={css.container}>
        <FontAwesomeIcon
            icon={faCircleNotch}
            spin
        />
    </div>
}