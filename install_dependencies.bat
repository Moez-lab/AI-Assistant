@echo off
echo ========================================
echo Face Recognition Environment Setup
echo ========================================
echo.

echo Step 1: Uninstalling conflicting packages...
call conda activate ass
pip uninstall deepface opencv-python opencv-contrib-python tensorflow tensorflow-intel keras h5py -y

echo.
echo Step 2: Installing h5py from conda-forge (includes proper DLLs)...
conda install -c conda-forge h5py=3.11.0 -y

echo.
echo Step 3: Installing OpenCV...
pip install opencv-python==4.8.1.78

echo.
echo Step 4: Installing TensorFlow 2.13...
pip install tensorflow==2.13.0 --no-deps
pip install keras==2.13.1
pip install tensorflow-io-gcs-filesystem==0.31.0

echo.
echo Step 5: Installing DeepFace with  --no-deps...
pip install deepface --no-deps
pip install pandas gdown requests tqdm Pillow numpy

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo Now you can run: python setup.py
pause
