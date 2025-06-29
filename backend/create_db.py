# create_db.py

from app import app, db   # make sure your Flask app is in app.py and named 'app'
   
def create():
    with app.app_context():
        db.create_all()
        print('? evolvx.db and tables created!')

if __name__ == '__main__':
    create()
